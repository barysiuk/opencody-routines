# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2] - 2026-01-07

### Added
- **Watch mode with hot reload** - Use `--watch` flag to automatically reload routines when files change (2s debounce)
- **Push notifications** - New `notify` section in `new_session` action to send push notifications via `opencody-relay`
  - Supports `title`, `body` (required) and `deeplink` (optional)
  - Template variables: `{{session_id}}`, `{{routine_name}}`, plus all existing date/time variables
- **Improved error handling** - Invalid routines are logged with details but don't stop the daemon
- **Better logging** - Shows count of valid/invalid routines on startup and reload

### Changed
- `-r, --routines <path>` is now **required** (no default value)
- Renamed `routines/` folder to `examples/`
- `list` command now shows invalid routines section with error details

## [0.0.1] - 2026-01-05

### Added
- Initial release
- Schedule-based triggers with human-readable schedules and cron expressions
- Template variables in messages and titles (`{{date}}`, `{{weekday}}`, etc.)
- YAML configuration for routines
- CLI commands: `start`, `list`, `validate`, `run`
- Dry-run mode for previewing routine execution
