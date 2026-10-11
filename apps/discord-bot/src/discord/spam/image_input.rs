//! Bounded Discord CDN downloads for Decisions API inline images.

use base64::{Engine as _, engine::general_purpose::STANDARD};
use futures_util::StreamExt;
use reqwest::{Client, Response, StatusCode};

use crate::Error;
use crate::discord::spam::ImageRef;
use crate::discord::spam::openrouter::validate_image;

pub(super) struct InlineImage {
    pub data_url: String,
    pub byte_len: u64,
}

pub(super) async fn image_data_url(
    http: &Client,
    image: &ImageRef,
    max_bytes: u64,
) -> Result<InlineImage, Error> {
    validate_image(image, max_bytes).map_err(invalid)?;
    let mime = image
        .content_type
        .as_deref()
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !matches!(mime.as_str(), "image/png" | "image/jpeg" | "image/webp") {
        return Err(invalid("Decisions images must be PNG, JPEG, or WebP"));
    }

    // Caller disables redirects. No OpenRouter credentials on CDN requests.
    let response = http
        .get(&image.url)
        .send()
        .await
        .map_err(|error| error.without_url())?;
    response_to_data_url(response, &mime, max_bytes).await
}

async fn response_to_data_url(
    response: Response,
    expected_mime: &str,
    max_bytes: u64,
) -> Result<InlineImage, Error> {
    if response.status() != StatusCode::OK {
        return Err(invalid(format!(
            "image download returned status {}",
            response.status()
        )));
    }
    if response
        .content_length()
        .is_some_and(|length| length > max_bytes)
    {
        return Err(invalid("image Content-Length exceeds byte cap"));
    }

    let mut bytes = Vec::new();
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|error| error.without_url())?;
        if chunk.len() as u64 > max_bytes.saturating_sub(bytes.len() as u64) {
            return Err(invalid("image download exceeds byte cap"));
        }
        bytes.extend_from_slice(&chunk);
    }
    if bytes.is_empty() {
        return Err(invalid("image download produced no bytes"));
    }
    if image_mime(&bytes) != Some(expected_mime) {
        return Err(invalid(
            "image bytes do not match declared PNG, JPEG, or WebP type",
        ));
    }

    let mut data_url = format!("data:{expected_mime};base64,");
    STANDARD.encode_string(&bytes, &mut data_url);
    Ok(InlineImage {
        data_url,
        byte_len: bytes.len() as u64,
    })
}

pub(super) async fn stored_bytes(
    file: &super::evidence::StoredImage,
    image: &ImageRef,
    max_bytes: u64,
) -> Result<Vec<u8>, Error> {
    use tokio::io::AsyncReadExt;
    validate_image(image, max_bytes).map_err(invalid)?;
    let mut bytes = Vec::new();
    tokio::fs::File::open(file.path())
        .await?
        .take(max_bytes + 1)
        .read_to_end(&mut bytes)
        .await?;
    if bytes.is_empty() || bytes.len() as u64 > max_bytes {
        return Err(invalid("stored image empty or exceeds byte cap"));
    }
    let expected = image
        .content_type
        .as_deref()
        .unwrap_or_default()
        .to_ascii_lowercase();
    if image_mime(&bytes) != Some(expected.as_str()) {
        return Err(invalid(
            "stored image must match declared PNG, JPEG, or WebP type",
        ));
    }
    Ok(bytes)
}

pub(super) async fn stored_data_url(
    file: &super::evidence::StoredImage,
    image: &ImageRef,
    max_bytes: u64,
) -> Result<InlineImage, Error> {
    let bytes = stored_bytes(file, image, max_bytes).await?;
    let mime = image_mime(&bytes).expect("stored bytes validated");
    let mut data_url = format!("data:{mime};base64,");
    STANDARD.encode_string(&bytes, &mut data_url);
    Ok(InlineImage {
        data_url,
        byte_len: bytes.len() as u64,
    })
}

fn image_mime(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        Some("image/png")
    } else if bytes.starts_with(b"\xff\xd8\xff") {
        Some("image/jpeg")
    } else if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") {
        Some("image/webp")
    } else {
        None
    }
}

fn invalid(message: impl Into<String>) -> Error {
    std::io::Error::other(message.into()).into()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::discord::spam::test_support::MockServer;

    const PNG: &[u8] = b"\x89PNG\r\n\x1a\nfixture";

    fn http() -> Client {
        Client::builder()
            .timeout(std::time::Duration::from_secs(2))
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .unwrap()
    }

    #[tokio::test]
    async fn encodes_supported_formats_without_credentials() {
        for (mime, bytes) in [
            ("image/png", PNG),
            ("image/jpeg", b"\xff\xd8\xfffixture".as_slice()),
            ("image/webp", b"RIFF\x04\x00\x00\x00WEBPfixture".as_slice()),
        ] {
            let server = MockServer::spawn_ok(bytes.to_vec()).await;
            let response = http().get(server.url()).send().await.unwrap();
            let url = response_to_data_url(response, mime, bytes.len() as u64)
                .await
                .unwrap();
            assert_eq!(
                url.data_url,
                format!("data:{mime};base64,{}", STANDARD.encode(bytes))
            );
            assert_eq!(url.byte_len, bytes.len() as u64);
            assert_eq!(server.requests()[0].header("authorization"), None);
        }
    }

    #[tokio::test]
    async fn rejects_failed_empty_oversized_or_mislabeled_downloads() {
        for (status, bytes, cap, mime) in [
            (403, PNG.to_vec(), 100, "image/png"),
            (302, PNG.to_vec(), 100, "image/png"),
            (206, PNG.to_vec(), 100, "image/png"),
            (200, vec![], 100, "image/png"),
            (200, PNG.to_vec(), 4, "image/png"),
            (200, PNG.to_vec(), 100, "image/jpeg"),
            (200, b"<html>not an image</html>".to_vec(), 100, "image/png"),
            (200, b"GIF89afixture".to_vec(), 100, "image/gif"),
        ] {
            let server = MockServer::spawn(status, bytes).await;
            let response = http().get(server.url()).send().await.unwrap();
            assert!(response_to_data_url(response, mime, cap).await.is_err());
        }
    }

    #[tokio::test]
    async fn enforces_stream_cap_without_content_length() {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let task = tokio::spawn(async move {
            let (mut stream, _) = listener.accept().await.unwrap();
            let mut request = [0; 2048];
            let _ = stream.read(&mut request).await.unwrap();
            stream.write_all(b"HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n8\r\n\x89PNG\r\n\x1a\n\r\n8\r\n12345678\r\n0\r\n\r\n").await.unwrap();
        });
        let response = http()
            .get(format!("http://{address}"))
            .send()
            .await
            .unwrap();
        assert!(response.content_length().is_none());
        let error = response_to_data_url(response, "image/png", 10)
            .await
            .err()
            .expect("stream must exceed cap");
        assert!(error.to_string().contains("exceeds byte cap"));
        task.await.unwrap();
    }

    #[tokio::test]
    async fn rejects_off_cdn_oversized_and_gif_images_before_fetch() {
        for (url, filename, mime, size) in [
            ("http://127.0.0.1:9/x.png", "x.png", "image/png", 1),
            ("https://evil.example/x.png", "x.png", "image/png", 1),
            (
                "https://cdn.discordapp.com/x.png",
                "x.png",
                "image/png",
                101,
            ),
            ("https://cdn.discordapp.com/x.gif", "x.gif", "image/gif", 1),
        ] {
            let image = ImageRef {
                url: url.to_string(),
                filename: filename.to_string(),
                content_type: Some(mime.to_string()),
                declared_size: Some(size),
                width: None,
                height: None,
            };
            assert!(image_data_url(&http(), &image, 100).await.is_err());
        }
    }
}
