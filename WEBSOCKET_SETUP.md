# WebSocket Setup Guide

This project uses Django Channels for WebSocket support, enabling real-time messaging and handshake functionality.

## Installation

The required packages are already in `requirements.txt`:

- `channels==4.0.0`
- `channels-redis==4.2.0` (optional, for production with Redis)
- `daphne==4.1.0` (ASGI server)

Install dependencies:

```bash
pip install -r requirements.txt
```

## Running the Server

### Local Development

For local development with WebSocket support, use `daphne` instead of `runserver`:

```bash
daphne appsite.asgi:application
```

Or with a specific host and port:

```bash
daphne -b 0.0.0.0 -p 8000 appsite.asgi:application
```

### Docker Compose

The `docker-compose.yml` is already configured to use `daphne` for WebSocket support.

## WebSocket Endpoints

### Chat WebSocket

- **URL**: `ws://localhost:8000/ws/chat/{conversation_id}/`
- **Authentication**: Token passed as query parameter: `?token={auth_token}`
- **Conversation ID Format**: `offer_{offer_id}` or `need_{need_id}` (e.g., `offer_123`, `need_456`)

### Message Types

#### Send Message

```json
{
  "type": "message",
  "content": "Hello!"
}
```

Note: The `recipient_id` is automatically determined from the conversation context (offer/need owner).

#### Start Handshake

```json
{
  "type": "handshake_start"
}
```

Note: The handshake is automatically associated with the current conversation's offer/need.

#### Approve Handshake

```json
{
  "type": "handshake_approve"
}
```

Note: The handshake ID is automatically determined from the conversation context.

### Receive Messages

#### New Message

```json
{
  "type": "message",
  "message": {
    "id": 1,
    "sender": {
      "id": 1,
      "username": "user1",
      "full_name": "User One"
    },
    "content": "Hello!",
    "created_at": "2024-01-01T12:00:00Z",
    "is_read": false
  }
}
```

#### Handshake Update

```json
{
  "type": "handshake",
  "handshake": {
    "id": "handshake_1_2",
    "status": "pending",
    "user1_id": 1,
    "user2_id": 2,
    "initiator_id": 1,
    "message": "Handshake request sent"
  }
}
```

## Frontend Integration

The frontend WebSocket manager is located at `frontend/src/utils/websocket.js` and is automatically used by the Messages component.

The WebSocket connection is established when a conversation is selected and automatically reconnects on disconnect.

## Production Considerations

For production, consider using Redis as the channel layer backend:

1. Install Redis
2. Update `settings.py`:

```python
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}
```

## Testing

To test WebSocket connections, you can use tools like:

- Browser DevTools (Network tab → WS filter)
- `wscat` (npm install -g wscat)
- Postman (WebSocket support)

Example with wscat:

```bash
wscat -c "ws://localhost:8000/ws/chat/offer_123/?token=YOUR_TOKEN"
```

## Important: Server Must Use Daphne

**The Django development server (`runserver`) does NOT support WebSockets.** You must use `daphne` for WebSocket connections to work.

### Running Daphne Manually

If you're currently running the server with `python manage.py runserver`, stop it and restart with:

```bash
daphne -b 0.0.0.0 -p 8000 appsite.asgi:application
```

Or if you're using a virtual environment:

```bash
source venv/bin/activate  # On Windows: venv\Scripts\activate
daphne -b 0.0.0.0 -p 8000 appsite.asgi:application
```

### VS Code/Cursor Debugger Configuration

A debugger configuration file (`.vscode/launch.json`) has been created with two options:

1. **"Django: Daphne (WebSocket Support)"** - Use this for debugging with WebSocket support
2. **"Django: Runserver (No WebSocket)"** - Use this only if you don't need WebSocket functionality

To use the debugger:

1. Open the Run and Debug panel (Cmd+Shift+D / Ctrl+Shift+D)
2. Select "Django: Daphne (WebSocket Support)" from the dropdown
3. Press F5 or click the green play button

**Important:** Make sure to select the "Daphne" configuration, not the "Runserver" one, when debugging with WebSocket features.

## Token Authentication

The WebSocket uses token-based authentication stored in a database-backed cache. This ensures tokens are shared between HTTP and WebSocket processes.

**If you're experiencing authentication issues:**

1. Make sure you're logged in (check that you have a valid token)
2. If you just switched from `LocMemCache` to `DatabaseCache`, you may need to log out and log back in to get a new token stored in the database cache
3. Tokens are valid for 24 hours after login

The cache table (`cache_table`) is automatically created when you run:

```bash
python manage.py createcachetable
```
