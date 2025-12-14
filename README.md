# Sunsama HTTP API Server

> **Disclaimer**: This is an unofficial wrapper for the Sunsama API. It is not affiliated with or endorsed by Sunsama.

HTTP REST API server for [Sunsama](https://sunsama.com) daily planning, designed for integration with [n8n](https://n8n.io) and other automation tools.

## Credits

This project is built on top of [sunsama-api](https://github.com/robertn702/sunsama-api) by [Robert Niimi (@robertn702)](https://github.com/robertn702). Huge thanks to him for creating the excellent TypeScript wrapper for the Sunsama API!

## Features

- **Multi-user support** - Single container handles multiple Sunsama accounts via API keys
- **Docker-ready** - Includes Dockerfile and docker-compose.yml with secrets support
- **n8n compatible** - REST API designed for easy integration with n8n workflows
- **Secure** - Support for Docker secrets to protect credentials
- **Full CRUD** - Complete task management: create, read, update, delete
- **Type-safe** - Built with TypeScript

## Quick Start

### Using Docker (Recommended)

1. **Create secrets directory:**
   ```bash
   mkdir -p secrets
   echo "your-email@sunsama.com:your-password" > secrets/user1.txt
   ```

2. **Start the server:**
   ```bash
   docker-compose up -d
   ```

3. **Test the API:**
   ```bash
   curl -H "Authorization: Bearer sk_user1" http://localhost:3000/api/user
   ```

### Local Development

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure API keys:**
   ```bash
   cp .env.example .env
   # Edit .env with your Sunsama credentials
   # Format: API_KEY_<your-key>=<email>:<password>
   ```

3. **Start the server:**
   ```bash
   pnpm dev:server
   ```

## API Endpoints

All API endpoints require authentication via `Authorization: Bearer <api_key>` header.

### Health Check (no auth)

```http
GET /health
```

### User

```http
GET /api/user              # Get current user info
GET /api/user/timezone     # Get user timezone
```

### Streams

```http
GET /api/streams           # Get all streams/projects
```

### Tasks

```http
GET /api/tasks/day/:date   # Get tasks for a specific day (YYYY-MM-DD)
GET /api/tasks/backlog     # Get backlog tasks
GET /api/tasks/archived    # Get archived tasks (?offset=0&limit=300)
GET /api/tasks/:id         # Get task by ID

POST /api/tasks            # Create a new task
  Body: { text, notes?, timeEstimate?, streamIds?, timeHorizon?, dueDate?, snoozeUntil?, private?, taskId? }

PATCH /api/tasks/:id/complete      # Mark task complete
PATCH /api/tasks/:id/snooze        # Schedule task to a specific day
POST  /api/tasks/:id/backlog       # Move task to backlog
PATCH /api/tasks/:id/notes         # Update task notes
PATCH /api/tasks/:id/planned-time  # Update time estimate
PATCH /api/tasks/:id/due-date      # Update due date
PATCH /api/tasks/:id/text          # Update task text
PATCH /api/tasks/:id/stream        # Update stream assignment

DELETE /api/tasks/:id      # Delete task
```

## n8n Integration

### HTTP Request Node Configuration

1. **Method:** GET, POST, PATCH, or DELETE
2. **URL:** `http://your-server:3000/api/tasks`
3. **Authentication:** Header Auth
4. **Header Name:** `Authorization`
5. **Header Value:** `Bearer sk_your_api_key`

### Example: Get Today's Tasks

```
Method: GET
URL: http://localhost:3000/api/tasks/day/{{ $now.format('yyyy-MM-dd') }}
Headers:
  Authorization: Bearer sk_user1
```

### Example: Create Task from n8n

```
Method: POST
URL: http://localhost:3000/api/tasks
Headers:
  Authorization: Bearer sk_user1
  Content-Type: application/json
Body:
  {
    "text": "Task created from n8n",
    "timeEstimate": 30
  }
```

### Example: Create Task in Backlog Bucket

You can create tasks in specific backlog buckets using the `timeHorizon` parameter:

```
Method: POST
URL: http://localhost:3000/api/tasks
Headers:
  Authorization: Bearer sk_user1
  Content-Type: application/json
Body:
  {
    "text": "Task in next quarter",
    "timeHorizon": "next-quarter"
  }
```

**Available `timeHorizon` values:**
- `soon` - Someday in the next week or two
- `next` - Someday in the next month
- `next-quarter` - Someday in the next quarter
- `later` - Someday in the next year
- `someday` - Someday (default if not specified)
- `never` - Never

Tasks without `timeHorizon` will be placed in the "Someday" bucket by default.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `HOST` | Bind address | `0.0.0.0` |
| `API_KEY_<key>` | Direct credentials: `email:password` | - |
| `API_KEY_<key>_FILE` | Path to file containing `email:password` | - |

### Docker Secrets (Production)

```yaml
environment:
  - API_KEY_sk_user1_FILE=/run/secrets/user1_creds
secrets:
  - user1_creds

secrets:
  user1_creds:
    file: ./secrets/user1.txt
```

## Error Responses

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

| Status | Description |
|--------|-------------|
| 400 | Validation error |
| 401 | Authentication error |
| 404 | Resource not found |
| 500 | Internal server error |
| 502 | Upstream API error |
| 503 | Network error |

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev:server

# Build for production
pnpm build

# Run production server
pnpm start

# Run tests
pnpm test
```

## License

MIT License - see [LICENSE](LICENSE) for details.

This project is built upon [sunsama-api](https://github.com/robertn702/sunsama-api) which is also MIT licensed.

## Acknowledgments

- [Robert Niimi (@robertn702)](https://github.com/robertn702) - Creator of the original [sunsama-api](https://github.com/robertn702/sunsama-api) TypeScript wrapper
- [Sunsama](https://sunsama.com) - The daily planner for busy professionals
