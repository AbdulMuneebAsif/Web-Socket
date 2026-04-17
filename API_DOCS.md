# WebSocket API Documentation

## Server Information

-   **WebSocket URL**: `ws://localhost:6789`
-   **REST API Base**: `http://localhost:6789`
-   **JWT Secret**: `your-secret-key-change-in-production`

## Authentication

All REST API endpoints require JWT token in Authorization header:

```
Authorization: Bearer <token>
```

Generate token:

```javascript
const jwt = require("jsonwebtoken");
const token = jwt.sign(
    { user: "test_user" },
    "your-secret-key-change-in-production",
    { expiresIn: "1h" }
);
```

## WebSocket Connection

### Connect to WebSocket

```
ws://localhost:6789?device_id=YOUR_DEVICE_ID
```

**Query Parameters:**

-   `device_id` (required): Unique identifier for the device (e.g., `roku_123`, `device_456`)

**Example Connection:**

```
ws://localhost:6789?device_id=roku_device_001
```

**Welcome Message (on connect):**

```json
{
    "type": "welcome",
    "message": "Connected to WebSocket server!",
    "device_id": "roku_device_001",
    "server_id": 12345,
    "timestamp": "2026-04-14T10:30:00.000Z"
}
```

## REST API Endpoints

### 1. Send Targeted Notification to Specific Device

**Endpoint:** `POST /api/notify/:device_id`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

**Request Body:**

```json
{
    "message": "Your notification message",
    "type": "notification",
    "data": {
        "custom_field": "custom_value"
    }
}
```

**Example (Postman):**

```
POST http://localhost:6789/api/notify/roku_device_001

Headers:
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Body (JSON):
{
  "message": "New content available!",
  "type": "notification",
  "data": {
    "content_id": "12345",
    "action": "refresh"
  }
}
```

**Response:**

```json
{
    "success": true,
    "message": "Notification sent",
    "target": "roku_device_001",
    "timestamp": "2026-04-14T10:30:00.000Z"
}
```

### 2. Broadcast to All Connected Devices

**Endpoint:** `POST /api/broadcast`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

**Request Body:**

```json
{
    "message": "Broadcast message to all devices",
    "type": "broadcast",
    "data": {}
}
```

**Response:**

```json
{
    "success": true,
    "message": "Broadcast sent",
    "timestamp": "2026-04-14T10:30:00.000Z"
}
```

## Roku BrightScript Example

```brightscript
' ============================================
' Roku WebSocket Client Implementation
' ============================================

function InitWebSocket(deviceId as String)
    ' Create WebSocket connection
    wsUrl = "ws://localhost:6789?device_id=" + deviceId

    ' Note: Roku doesn't have native WebSocket support
    ' You'll need to use a polling approach or external service
    ' Here's a conceptual example using roURLTransfer

    transfer = CreateObject("roURLTransfer")
    transfer.SetUrl(wsUrl)

    ' For actual WebSocket on Roku, consider:
    ' 1. Using a bridge server that converts HTTP to WebSocket
    ' 2. Using Server-Sent Events (SSE) instead
    ' 3. Implementing WebSocket protocol manually

    return transfer
end function

function SendHttpRequest(method as String, endpoint as String, body as Object, token as String)
    transfer = CreateObject("roURLTransfer")
    transfer.SetUrl("http://localhost:6789" + endpoint)
    transfer.AddHeader("Content-Type", "application/json")
    transfer.AddHeader("Authorization", "Bearer " + token)

    if method = "POST"
        jsonBody = FormatJson(body)
        transfer.SetRequest("POST")
        response = transfer.PostFromString(jsonBody)
        return response
    end if

    return ""
end function

' Example: Trigger notification from Roku
function TriggerNotification()
    token = "your_jwt_token_here"
    deviceId = "roku_device_001"

    notification = {
        "message": "Hello from Roku!",
        "type": "notification",
        "data": {
            "source": "roku"
        }
    }

    endpoint = "/api/notify/" + deviceId
    response = SendHttpRequest("POST", endpoint, notification, token)

    return response
end function
```

## Testing with Postman

### Test 1: Connect to WebSocket

1. Use Postman's WebSocket feature
2. URL: `ws://localhost:6789?device_id=test_device_001`
3. Click Connect
4. You'll receive welcome message

### Test 2: Send Targeted Notification

1. Create new POST request
2. URL: `http://localhost:6789/api/notify/test_device_001`
3. Headers:
    - `Content-Type`: `application/json`
    - `Authorization`: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoidGVzdF91c2VyIiwiaWF0IjoxNzEzMDk2MDAwLCJleHAiOjE3MTMwOTk2MDB9.example`
4. Body (raw JSON):

```json
{
    "message": "Test notification",
    "type": "notification",
    "data": {
        "test": true
    }
}
```

5. Send

### Test 3: Generate JWT Token

Use this Node.js script to generate tokens:

```javascript
const jwt = require("jsonwebtoken");
const token = jwt.sign(
    { user: "test_user", device: "roku_001" },
    "your-secret-key-change-in-production",
    { expiresIn: "24h" }
);
console.log(token);
```

## Message Types

### From Server to Client:

**Welcome:**

```json
{
    "type": "welcome",
    "message": "Connected to WebSocket server!",
    "device_id": "roku_001",
    "server_id": 12345,
    "timestamp": "2026-04-14T10:30:00.000Z"
}
```

**Targeted Notification:**

```json
{
    "type": "notification",
    "message": "Your message here",
    "device_id": "roku_001",
    "data": {},
    "timestamp": "2026-04-14T10:30:00.000Z",
    "server_id": 12345
}
```

**Broadcast:**

```json
{
    "type": "broadcast",
    "message": "Message to all devices",
    "data": {},
    "timestamp": "2026-04-14T10:30:00.000Z",
    "broadcast": true
}
```

**Echo Response:**

```json
{
    "type": "echo",
    "message": "Your message",
    "device_id": "roku_001",
    "timestamp": "2026-04-14T10:30:00.000Z"
}
```

## Quick Start

1. **Start Redis**: `redis-server`
2. **Start Server**: `npm start`
3. **Connect via WebSocket**: `ws://localhost:6789?device_id=your_device_id`
4. **Send Notification**: POST to `http://localhost:6789/api/notify/your_device_id` with JWT token
5. **Receive**: Message arrives on WebSocket connection in real-time
