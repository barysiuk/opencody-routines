# OpenCody Routines

A simple automation engine for [OpenCode](https://opencode.ai) that schedules routines to run sessions automatically.

## Features

- **Schedule-based triggers** - Run routines at specific times using human-readable schedules or cron expressions
- **Template variables** - Dynamic content in messages and titles (`{{date}}`, `{{weekday}}`, etc.)
- **YAML configuration** - Simple, readable routine definitions
- **Dry-run mode** - Preview what would be sent without executing

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/opencody-routines.git
cd opencody-routines

# Install dependencies
npm install

# Build
npm run build
```

## Quick Start

1. **Start an OpenCode server:**

   ```bash
   opencode serve --port 4096
   ```

2. **Create a routine** in your routines directory:

   ```yaml
   # my-routines/morning-review.yaml
   name: Morning Day Review
   description: Start the day with a review of tasks

   triggers:
     schedule:
       when: "at 9:00 am"

   action:
     type: new_session
     title: "Morning Review - {{date}}"
     message: |
       Good morning! It's {{weekday}}, {{date}}.
       Let's review today's priorities.
   ```

3. **Start the daemon:**

   ```bash
   opencody-routines start -r ./my-routines -s http://localhost:4096
   ```

## CLI Commands

### `start`

Start the routines daemon.

```bash
opencody-routines start -r <path> [options]

Options:
  -r, --routines <path>  Path to routines directory (required)
  -s, --server <url>     OpenCode server URL (default: "http://localhost:4096")
  -w, --watch            Watch routines directory for changes (hot reload with 2s debounce)
```

### `list`

List all routines and their schedules.

```bash
opencody-routines list -r <path>
```

### `validate`

Validate all routine files.

```bash
opencody-routines validate -r <path>
```

### `run`

Run a specific routine immediately.

```bash
opencody-routines run <name> -r <path> [options]

Options:
  -r, --routines <path>  Path to routines directory (required)
  -s, --server <url>     OpenCode server URL (default: "http://localhost:4096")
  --dry-run              Show what would be sent without executing
```

## Routine Format

Routines are defined in YAML files:

```yaml
name: Weekly Review
description: Friday end-of-week review and planning
enabled: true  # optional, defaults to true

triggers:
  schedule:
    when: "at 5:00 pm on friday"
    timezone: America/New_York  # optional, defaults to system timezone

action:
  type: new_session
  title: "Weekly Review - Week {{week}}"  # optional
  model: anthropic/claude-sonnet-4-20250514  # optional
  agent: default  # optional
  message: |
    It's Friday! Time for our weekly review.
    Please summarize what was accomplished this week.
```

### Schedule Syntax

The `when` field supports both human-readable schedules and cron expressions:

**Human-readable (via [later.js](https://breejs.github.io/later/)):**

```yaml
when: "at 9:00 am"
when: "at 5:00 pm on friday"
when: "every weekday at 9:00 am"
when: "every 2 hours"
```

**Cron expressions:**

```yaml
when: "0 9 * * *"      # 9 AM daily
when: "0 9 * * 1-5"    # 9 AM weekdays
when: "0 17 * * 5"     # 5 PM Friday
when: "*/30 * * * *"   # Every 30 minutes
```

### Template Variables

Use these variables in `title` and `message` fields:

| Variable | Example | Description |
|----------|---------|-------------|
| `{{date}}` | `2026-01-05` | ISO date |
| `{{time}}` | `14:30` | 24h time |
| `{{datetime}}` | `2026-01-05T14:30:00` | ISO datetime |
| `{{year}}` | `2026` | Year |
| `{{month}}` | `01` | Month (01-12) |
| `{{day}}` | `05` | Day (01-31) |
| `{{week}}` | `01` | ISO week number |
| `{{weekday}}` | `Monday` | Day name |

## Examples

### Morning Daily Review

```yaml
name: Morning Day Review
description: Start the day with a review of tasks and priorities

triggers:
  schedule:
    when: "at 9:00 am"

action:
  type: new_session
  title: "Morning Review - {{date}}"
  message: |
    Good morning! It's {{weekday}}, {{date}}.

    Let's do a daily review:
    1. What are my priorities for today?
    2. Are there any pending tasks from yesterday?
    3. What meetings or commitments do I have?

    Please help me organize my day effectively.
```

### Evening Summary

```yaml
name: Evening Summary
description: End of day wrap-up and reflection

triggers:
  schedule:
    when: "at 6:00 pm"

action:
  type: new_session
  title: "Evening Summary - {{date}}"
  message: |
    Good evening! Let's wrap up the day.

    Please help me:
    1. Summarize what I accomplished today
    2. Note any tasks that need to carry over
    3. Capture any important insights
```

### Weekly Review (Cron)

```yaml
name: Weekly Review
description: Friday end-of-week review

triggers:
  schedule:
    when: "0 17 * * 5"  # 5 PM every Friday

action:
  type: new_session
  title: "Weekly Review - Week {{week}}, {{year}}"
  message: |
    It's Friday! Time for our weekly review.

    Please help me:
    1. Review what was accomplished this week
    2. Identify incomplete items
    3. Plan priorities for next week
```

## Future Trigger Types

The architecture supports adding more trigger types in the future:

```yaml
# File watcher (planned)
triggers:
  file_watch:
    path: ~/obsidian/transcripts/
    pattern: "*.md"
    event: created

# Webhook (planned)
triggers:
  webhook:
    path: /hooks/my-routine
```

## License

MIT
