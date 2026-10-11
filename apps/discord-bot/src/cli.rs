//! CLI arguments. Omitted subcommand starts Discord gateway.

use clap::{Parser, Subcommand};

#[derive(Debug, Parser)]
#[command(
    version,
    about = "Learnable Meta Discord bot. Omit subcommand to start Discord gateway."
)]
pub(crate) struct Cli {
    #[command(subcommand)]
    pub command: Option<Command>,
}

#[derive(Debug, PartialEq, Subcommand)]
pub(crate) enum Command {
    /// Post daily GeoGuessr challenge.
    Challenge,
    /// Always check text with OpenRouter stage two and every council member; no moderation.
    SpamCheck {
        /// Message text, quoted as one argument.
        #[arg(value_name = "MESSAGE", value_parser = non_blank_message)]
        text: String,
    },
}

fn non_blank_message(text: &str) -> Result<String, String> {
    if text.trim().is_empty() {
        return Err("spam-check requires non-empty message text".to_string());
    }
    Ok(text.to_owned())
}

#[cfg(test)]
mod tests {
    use clap::{CommandFactory, error::ErrorKind};

    use super::*;

    fn parse(args: &[&str]) -> Result<Cli, clap::Error> {
        Cli::try_parse_from(std::iter::once("discord-bot").chain(args.iter().copied()))
    }

    #[test]
    fn command_definitions_are_valid() {
        Cli::command().debug_assert();
    }

    #[test]
    fn preserves_gateway_default_and_challenge_command() {
        assert_eq!(parse(&[]).unwrap().command, None);
        assert_eq!(
            parse(&["challenge"]).unwrap().command,
            Some(Command::Challenge)
        );
    }

    #[test]
    fn generates_root_and_subcommand_help() {
        for args in [
            vec!["--help"],
            vec!["-h"],
            vec!["challenge", "--help"],
            vec!["spam-check", "--help"],
            vec!["help", "spam-check"],
        ] {
            let error = parse(&args).unwrap_err();
            assert_eq!(error.kind(), ErrorKind::DisplayHelp);
            assert_eq!(error.exit_code(), 0);
        }
        let help = parse(&["spam-check", "--help"]).unwrap_err().to_string();
        assert!(help.contains("<MESSAGE>"));
        assert!(help.contains("OpenRouter"));
        assert!(help.contains("Always check text"));
    }

    #[test]
    fn generates_version() {
        let error = parse(&["--version"]).unwrap_err();
        assert_eq!(error.kind(), ErrorKind::DisplayVersion);
        assert_eq!(error.exit_code(), 0);
    }

    #[test]
    fn preserves_message_whitespace_and_unicode() {
        let text = "  Hello GeoGuessr!\nSecond line: 🌍  ";
        assert_eq!(
            parse(&["spam-check", text]).unwrap().command,
            Some(Command::SpamCheck {
                text: text.to_owned()
            })
        );
    }

    #[test]
    fn accepts_flag_like_text_after_separator() {
        assert_eq!(
            parse(&["spam-check", "--", "--help"]).unwrap().command,
            Some(Command::SpamCheck {
                text: "--help".to_string()
            })
        );
    }

    #[test]
    fn rejects_missing_blank_extra_and_unknown_arguments() {
        for args in [
            vec!["spam-check"],
            vec!["spam-check", ""],
            vec!["spam-check", " \n\t "],
            vec!["spam-check", "hello", "world"],
            vec!["challenge", "extra"],
            vec!["challenge", "extra", "ignored"],
            vec!["unknown"],
            vec!["--unknown"],
            vec!["spam-check", "--unknown"],
        ] {
            let error = parse(&args).unwrap_err();
            assert_eq!(error.exit_code(), 2, "{args:?} must fail");
        }
    }
}
