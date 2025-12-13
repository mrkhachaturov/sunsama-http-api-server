# Sunsama API HTTP Server

REST API server wrapper for the Sunsama API, designed for integration with n8n and other automation tools.

## Features

- Multi-user support with API key authentication
- Docker secrets support for secure credential management
- Health check endpoint for container orchestration
- Comprehensive error handling with structured JSON responses

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure API keys:**
   ```bash
   # Copy example config
   cp .env.example .env
   
   # Edit .env with your Sunsama credentials
   # Format: API_KEY_<your-key>=<email>:<password>
   API_KEY_sk_mykey=your-email@example.com:your-password
   ```

3. **Start the server:**
   ```bash
   pnpm dev:server
   ```

4. **Test the API:**
   ```bash
   curl -H "Authorization: Bearer sk_mykey" http://localhost:3000/api/user
   ```

### Docker

1. **Create secrets directory:**
   ```bash
   mkdir -p secrets
   echo "your-email@example.com:your-password" > secrets/user1.txt
   ```

2. **Build and run:**
   ```bash
   docker-compose up -d
   ```

3. **Test:**
   ```bash
   curl -H "Authorization: Bearer sk_user1" http://localhost:3000/api/user
   ```

## API Endpoints

All API endpoints require authentication via the `Authorization: Bearer <api_key>` header.

### Health Check

```http
GET /health
```

No authentication required. Returns server status.

### User

```http
GET /api/user
GET /api/user/timezone
```

### Streams

```http
GET /api/streams
```

### Tasks

```http
GET /api/tasks/day/:date          # Get tasks for a specific day (YYYY-MM-DD)
GET /api/tasks/backlog            # Get backlog tasks
GET /api/tasks/archived           # Get archived tasks (?offset=0&limit=300)
GET /api/tasks/:id                # Get task by ID

POST /api/tasks                   # Create a new task
  Body: { text: string, notes?: string, timeEstimate?: number, streamIds?: string[] }

PATCH /api/tasks/:id/complete     # Mark task complete
PATCH /api/tasks/:id/snooze       # Update snooze date
  Body: { newDay: string | null, timezone?: string }
PATCH /api/tasks/:id/notes        # Update task notes
  Body: { html?: string, markdown?: string }
PATCH /api/tasks/:id/planned-time # Update time estimate
  Body: { timeEstimate: number }
PATCH /api/tasks/:id/due-date     # Update due date
  Body: { dueDate: string | null }
PATCH /api/tasks/:id/text         # Update task text
  Body: { text: string }
PATCH /api/tasks/:id/stream       # Update stream assignment
  Body: { streamId: string }

DELETE /api/tasks/:id             # Delete task
```

## n8n Integration

### HTTP Request Node Configuration

1. **Method:** GET, POST, PATCH, or DELETE (as needed)
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

### Example: Create Task

```
Method: POST
URL: http://localhost:3000/api/tasks
Headers:
  Authorization: Bearer sk_user1
  Content-Type: application/json
Body:
  {
    "text": "Task from n8n",
    "timeEstimate": 30
  }
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `HOST` | Bind address | `0.0.0.0` |
| `API_KEY_<key>` | Direct credentials: `email:password` | - |
| `API_KEY_<key>_FILE` | Path to file containing `email:password` | - |

### Docker Secrets

For production deployments, use Docker secrets:

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

All errors return a consistent JSON structure:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

### Status Codes

| Code | Description |
|------|-------------|
| 400 | Validation error |
| 401 | Authentication error (invalid/missing API key) |
| 404 | Resource not found |
| 500 | Internal server error |
| 502 | Upstream API error |
| 503 | Network/connectivity error |

