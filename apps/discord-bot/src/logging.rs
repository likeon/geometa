use tracing_subscriber::EnvFilter;

const DEFAULT_FILTER: &str = "warn,discord_bot=info";

pub fn init() {
    let filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(DEFAULT_FILTER));

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(true)
        .init();
}

#[cfg(test)]
mod tests {
    use super::DEFAULT_FILTER;

    #[test]
    fn default_filter_enables_app_info_and_dependency_warnings() {
        assert_eq!(DEFAULT_FILTER, "warn,discord_bot=info");
    }
}
