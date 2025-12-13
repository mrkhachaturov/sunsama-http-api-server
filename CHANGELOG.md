# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-12-13

### Added

- **Webhook System** - Real-time notifications when tasks change in Sunsama app
  - Polling-based change detection with 4-tier intervals (today, week, past, future)
  - Calendar-based week scope (Monday to Sunday)
  - Events: `task.created`, `task.completed`, `task.uncompleted`, `task.deleted`, `task.updated`, `task.scheduled`
  - HMAC signature (`X-Webhook-Signature`) for webhook verification
  - Smart filtering: only fires for changes made in Sunsama app, not via this API
  - Baseline storage on first poll (no initial event spam)
  - Tracks backlog bucket changes (timeHorizon)
- **Redis Integration** - Required when webhooks enabled for state persistence
- **Reverse Proxy Support** - Added `trust proxy` for nginx, Traefik, etc.
- **Logging System** - Configurable log levels (debug, info, warn, error) via `LOG_LEVEL` env var
- **Backlog Bucket Support** - Create tasks in specific backlog buckets via `timeHorizon` option
  - Supported values: `soon`, `next`, `next-quarter`, `later`, `someday`, `never`

### Configuration

New environment variables:
- `WEBHOOK_ENABLED` - Enable webhook system (default: false)
- `WEBHOOK_URL` - Target URL for webhook POSTs
- `WEBHOOK_SECRET` - HMAC signing secret
- `WEBHOOK_POLL_INTERVAL` - Today + backlog polling interval in seconds (default: 30)
- `WEBHOOK_POLL_INTERVAL_WEEK` - This week polling interval (default: 300 = 5 min)
- `WEBHOOK_POLL_INTERVAL_PAST` - Past weeks polling interval (default: 900 = 15 min)
- `WEBHOOK_POLL_INTERVAL_FUTURE` - Future weeks polling interval (default: 600 = 10 min)
- `WEBHOOK_POLL_WEEKS_PAST` - Number of past weeks to monitor (default: 1)
- `WEBHOOK_POLL_WEEKS_AHEAD` - Number of future weeks to monitor (default: 1)
- `WEBHOOK_POLL_EXTRA_DAYS_PAST` - Extra days before past weeks (default: 0)
- `WEBHOOK_POLL_EXTRA_DAYS_AHEAD` - Extra days after future weeks (default: 0)
- `WEBHOOK_EVENTS` - Comma-separated event filter (optional, default: all events)
- `REDIS_URL` - Redis connection URL (required when webhooks enabled)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Alternative Redis config
- `LOG_LEVEL` - Log level: debug, info, warn, error (default: info)
- `TZ` - Timezone for calendar week calculations (e.g., `Europe/Moscow`)

## [1.1.0] - 2025-12-13

### Added

- **Swagger UI** - Interactive API documentation at `/api-docs` when enabled
- **OpenAPI 3.0 Spec** - Raw spec available at `/api-docs.json`
- **ENABLE_SWAGGER env var** - Toggle Swagger UI (disabled by default for production)
- Full OpenAPI annotations for all 17 API endpoints

### Changed

- Helmet security middleware relaxed when Swagger is enabled (dev/testing only)

## [1.0.0] - 2025-12-13

### Added

- **HTTP REST API Server** - Express-based server for Sunsama API access
- **Multi-user support** - Single container handles multiple Sunsama accounts via API keys
- **API key authentication** - `Authorization: Bearer <api_key>` header authentication
- **Docker secrets support** - Secure credential management with `_FILE` suffix convention
- **Session management** - In-memory session caching for authenticated clients

### API Endpoints

- `GET /health` - Health check (no auth required)
- `GET /api/user` - Get current user info
- `GET /api/user/timezone` - Get user timezone
- `GET /api/streams` - Get all streams/projects
- `GET /api/tasks/day/:date` - Get tasks for a specific day
- `GET /api/tasks/backlog` - Get backlog tasks
- `GET /api/tasks/archived` - Get archived tasks with pagination
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create a new task
- `PATCH /api/tasks/:id/complete` - Mark task complete
- `PATCH /api/tasks/:id/snooze` - Schedule task / move to backlog
- `PATCH /api/tasks/:id/notes` - Update task notes (HTML/Markdown)
- `PATCH /api/tasks/:id/planned-time` - Update time estimate
- `PATCH /api/tasks/:id/due-date` - Update due date
- `PATCH /api/tasks/:id/text` - Update task text
- `PATCH /api/tasks/:id/stream` - Update stream assignment
- `DELETE /api/tasks/:id` - Delete task

### Docker

- Multi-stage Dockerfile with non-root user
- Docker Compose with secrets support
- Health check endpoint for container orchestration
- Published to `ghcr.io/astrateam-net/sunsama-api`

### Credits

Built on top of [sunsama-api](https://github.com/robertn702/sunsama-api) by [@robertn702](https://github.com/robertn702).

[1.2.0]: https://github.com/mrkhachaturov/sunsama-http-api-server/releases/tag/v1.2.0
[1.1.0]: https://github.com/mrkhachaturov/sunsama-http-api-server/releases/tag/v1.1.0
[1.0.0]: https://github.com/mrkhachaturov/sunsama-http-api-server/releases/tag/v1.0.0
