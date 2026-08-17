//! Minimal in-process HTTP test server (test-only).
//!
//! Answers each request from a scripted response queue (the last response
//! repeats), records every request, and exposes helpers for payload, path,
//! and header assertions. Avoids a dev-dependency on a mock-server crate.

use std::net::SocketAddr;
use std::sync::Arc;
use std::sync::Mutex;

use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::task::JoinHandle;

/// A parsed incoming request.
#[derive(Clone, Debug)]
pub struct RequestSnapshot {
    pub method: String,
    pub path: String,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

fn header_value<'a>(snapshot: &'a RequestSnapshot, name: &str) -> Option<&'a str> {
    snapshot
        .headers
        .iter()
        .find(|(key, _)| key == name)
        .map(|(_, value)| value.as_str())
}

impl RequestSnapshot {
    /// First value for a header name (exact, lowercase key).
    pub fn header(&self, name: &str) -> Option<&str> {
        header_value(self, name)
    }
}

/// A scripted HTTP response: (status, body bytes). The queue repeats its
/// last entry once exhausted.
type ScriptedResponse = (u16, Vec<u8>);

/// Queue of scripted responses shared with the serving task.
type ResponseQueue = Arc<Mutex<Vec<ScriptedResponse>>>;

/// Recorded request log shared with the serving task.
type RequestLog = Arc<Mutex<Vec<RequestSnapshot>>>;

pub struct MockServer {
    addr: SocketAddr,
    requests: RequestLog,
    // Kept alive for the lifetime of the server; served tasks hold clones.
    #[allow(dead_code)]
    responses: ResponseQueue,
    handle: JoinHandle<()>,
}

impl MockServer {
    /// Spawns a server always answering `status` with `body` (response
    /// repeats for every request).
    pub async fn spawn(status: u16, body: Vec<u8>) -> Self {
        Self::spawn_with_responses(vec![(status, body)]).await
    }

    /// Spawns a server answering `200 OK` with `body`.
    pub async fn spawn_ok(body: Vec<u8>) -> Self {
        Self::spawn(200, body).await
    }

    /// Spawns a server answering each request from the response list in
    /// order; the last response repeats after the list is exhausted.
    pub async fn spawn_scripted(responses: Vec<(u16, Vec<u8>)>) -> Self {
        assert!(
            !responses.is_empty(),
            "scripted responses must not be empty"
        );
        Self::spawn_with_responses(responses).await
    }

    async fn spawn_with_responses(responses: Vec<ScriptedResponse>) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind mock server");
        let addr = listener.local_addr().expect("mock address");

        let requests: RequestLog = Arc::new(Mutex::new(Vec::new()));
        let responses: ResponseQueue = Arc::new(Mutex::new(responses));

        let handle = tokio::spawn({
            let requests = requests.clone();
            let responses = responses.clone();
            async move {
                loop {
                    let Ok((stream, _)) = listener.accept().await else {
                        break;
                    };
                    let requests = requests.clone();
                    let responses = responses.clone();
                    tokio::spawn(async move {
                        let _ = serve_one(stream, &requests, &responses).await;
                    });
                }
            }
        });

        Self {
            addr,
            requests,
            responses,
            handle,
        }
    }

    /// Base URL of the mock server, e.g. `http://127.0.0.1:port`.
    pub fn url(&self) -> String {
        format!("http://{}", self.addr)
    }

    /// Requests recorded so far, oldest first.
    pub fn requests(&self) -> Vec<RequestSnapshot> {
        self.requests.lock().expect("request log").clone()
    }
}

impl Drop for MockServer {
    fn drop(&mut self) {
        self.handle.abort();
    }
}

/// Pops the next scripted response, or repeats the last one.
fn next_response(responses: &Mutex<Vec<ScriptedResponse>>) -> ScriptedResponse {
    let mut responses = responses.lock().expect("response queue");
    if responses.len() > 1 {
        responses.remove(0)
    } else {
        responses[0].clone()
    }
}

async fn serve_one(
    stream: TcpStream,
    requests: &RequestLog,
    responses: &ResponseQueue,
) -> std::io::Result<()> {
    let mut reader = tokio::io::BufReader::new(stream);
    let mut head_bytes = Vec::new();

    // Header block ends at an empty line after the request line.
    loop {
        let mut line = Vec::new();
        let read = reader.read_until(b'\n', &mut line).await?;
        if read == 0 {
            return Err(std::io::Error::other("mock peer closed early"));
        }
        if line == b"\r\n" || line == b"\n" {
            break;
        }
        head_bytes.extend_from_slice(&line);
    }

    let head = String::from_utf8_lossy(&head_bytes);
    let mut lines = head.lines();
    let request_line = lines.next().unwrap_or_default().to_string();
    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or_default().to_string();
    let path = parts.next().unwrap_or_default().to_string();

    let mut headers: Vec<(String, String)> = Vec::new();
    let mut content_length = 0usize;
    for line in lines {
        if let Some((name, value)) = line.split_once(':') {
            headers.push((name.trim().to_ascii_lowercase(), value.trim().to_string()));
        }
        if let Some(value) = line.to_ascii_lowercase().strip_prefix("content-length:") {
            content_length = value.trim().parse().unwrap_or(0);
        }
    }

    let mut body = vec![0u8; content_length];
    reader.read_exact(&mut body).await?;

    requests.lock().expect("request log").push(RequestSnapshot {
        method,
        path,
        headers,
        body,
    });

    let (status, response_body) = next_response(responses);

    let reason = match status {
        200 => "OK",
        500 => "Internal Server Error",
        _ => "Response",
    };

    let mut writer = reader.into_inner();
    writer
        .write_all(
            format!(
                "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                response_body.len()
            )
            .as_bytes(),
        )
        .await?;
    writer.write_all(&response_body).await?;
    writer.flush().await?;
    Ok(())
}
