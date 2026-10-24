#[test]
fn http2_support_remains_enabled_for_native_tls_alpn() {
    // Method gated by reqwest/http2; removing feature must fail compilation.
    reqwest::Client::builder()
        .http2_prior_knowledge()
        .build()
        .expect("HTTP/2 client required for native-TLS ALPN");
}
