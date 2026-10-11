//! One immutable, disk-backed input shared by stage two and council.

use sha2::{Digest, Sha256};

use super::ImageRef;
use super::evidence::StoredImage;
use super::image_input::stored_bytes;
use crate::Error;

pub struct PreparedInput {
    pub text: String,
    pub images: Vec<ImageRef>,
    pub stored: Vec<StoredImage>,
    image_hashes: Vec<[u8; 32]>,
}

impl PreparedInput {
    pub fn text(text: &str) -> Self {
        Self {
            text: text.to_owned(),
            images: Vec::new(),
            stored: Vec::new(),
            image_hashes: Vec::new(),
        }
    }

    pub async fn from_stored(
        text: &str,
        mut images: Vec<ImageRef>,
        stored: Vec<StoredImage>,
        max_bytes: u64,
    ) -> Result<Self, Error> {
        if images.len() != stored.len() {
            return Err(std::io::Error::other("not all message images were preserved").into());
        }
        let mut image_hashes = Vec::with_capacity(stored.len());
        for (image, file) in images.iter_mut().zip(&stored) {
            let bytes = stored_bytes(file, image, max_bytes).await?;
            image.declared_size = Some(bytes.len() as u64);
            image_hashes.push(Sha256::digest(&bytes).into());
        }
        Ok(Self {
            text: text.to_owned(),
            images,
            stored,
            image_hashes,
        })
    }

    pub fn key(&self, guild_id: u64) -> [u8; 32] {
        content_key(guild_id, &self.text, &self.image_hashes)
    }
}

fn content_key(guild_id: u64, text: &str, images: &[[u8; 32]]) -> [u8; 32] {
    let mut hash = Sha256::new();
    hash.update(guild_id.to_be_bytes());
    hash.update((text.len() as u64).to_be_bytes());
    hash.update(text.as_bytes());
    hash.update((images.len() as u64).to_be_bytes());
    for image in images {
        hash.update(image);
    }
    hash.finalize().into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn reuploads_match_by_bytes_not_cdn_url_or_filename() {
        use super::super::evidence::EvidenceStorage;
        let storage = EvidenceStorage::create_private().unwrap();
        let bytes = b"\x89PNG\r\n\x1a\nfixture";
        let mut inputs = Vec::new();
        for filename in ["first.png", "second.png"] {
            let stored = storage.fixture(filename, bytes).await;
            let image = ImageRef {
                url: format!("https://cdn.discordapp.com/attachments/1/2/{filename}"),
                filename: filename.to_string(),
                content_type: Some("image/png".to_string()),
                declared_size: Some(bytes.len() as u64),
                width: None,
                height: None,
            };
            inputs.push(
                PreparedInput::from_stored("same caption", vec![image], vec![stored], 1000)
                    .await
                    .unwrap(),
            );
        }
        assert_eq!(inputs[0].key(1), inputs[1].key(1));
        assert_ne!(inputs[0].images[0].url, inputs[1].images[0].url);
    }

    #[test]
    fn exact_identity_includes_guild_text_and_image_bytes_only() {
        let first = content_key(1, "offer", &[[1; 32]]);
        assert_eq!(first, content_key(1, "offer", &[[1; 32]]));
        assert_ne!(first, content_key(2, "offer", &[[1; 32]]));
        assert_ne!(first, content_key(1, "offer ", &[[1; 32]]));
        assert_ne!(first, content_key(1, "offer", &[[2; 32]]));
        assert_ne!(first, content_key(1, "offer", &[]));
        assert_ne!(first, content_key(1, "offer", &[[1; 32], [1; 32]]));
        assert_ne!(content_key(1, "a", &[]), content_key(1, "A", &[]));
    }
}
