# WebSocket Targeted Notification System

A production-ready WebSocket notification system with Redis-backed message brokering, JWT authentication, and targeted device messaging. Built with Node.js, designed for horizontal scaling.

## 🚀 Features

-   **Real-time WebSocket Communication** - Full-duplex bidirectional messaging
-   **Targeted Device Notifications** - Send messages to specific devices via `device_id`
-   **Redis Channel Layer** - Horizontal scaling across multiple server instances
-   **JWT Authentication** - Secure REST API endpoints for triggering notifications
-   **Message Broadcasting** - Send to all connected devices simultaneously
-   **Automatic Verification** - Server sends verification payload every 5 seconds
-   **Beautiful Glassmorphism UI** - Modern dark-themed interface with live/history tabs
-   **Message History** - Persistent message log with clear functionality

## 📋 Prerequisites

-   **Node.js** v18, v20, or >=v22
-   **Redis** server (for message brokering)
-   **npm** or **yarn**

## 🛠️ Installation

1. **Clone the repository:**

```bash
git clone [<repository-url>](https://github.com/AbdulMuneebAsif/Web-Socket.git)
cd Web-Socket
```

2. **Install dependencies:**

```bash
npm install
```

3. **Start Redis server:**

```bash
# On Linux/Mac
redis-server

# On Windows (if using WSL)
sudo service redis-server start
```

4. **Start the application:**

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

Server will start on **http://localhost:6789**

## 📖 Usage

### WebSocket Connection

Connect to the WebSocket server with a unique device ID:

```
ws://localhost:6789?device_id=your_device_id
```

**Example:**

```javascript
const ws = new WebSocket("ws://localhost:6789?device_id=roku_device_001");

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Received:", data);
};
```

### REST API Endpoints

All API endpoints require JWT authentication.

#### 1. Send Targeted Notification

Send a message to a specific device:

```http
POST http://localhost:6789/api/notify/:device_id
```

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

**Response:**

```json
{
    "success": true,
    "message": "Notification sent",
    "target": "roku_device_001",
    "timestamp": "2026-04-17T10:30:00.000Z"
}
```

#### 2. Broadcast to All Devices

Send a message to all connected devices:

```http
POST http://localhost:6789/api/broadcast
```

**Request Body:**

```json
{
    "message": "Broadcast message",
    "type": "broadcast",
    "data": {}
}
```

### Generating JWT Tokens

```javascript
const jwt = require("jsonwebtoken");

const token = jwt.sign(
    { user: "test_user", device: "roku_001" },
    "your-secret-key-change-in-production",
    { expiresIn: "24h" }
);

console.log(token);
```

### Testing with Postman

1. **WebSocket Connection:**

    - Use Postman's WebSocket feature
    - URL: `ws://localhost:6789?device_id=test_device_001`

2. **Send Notification:**

    - Method: `POST`
    - URL: `http://localhost:6789/api/notify/test_device_001`
    - Headers: Add `Authorization: Bearer <token>`
    - Body: JSON format with message

3. **Broadcast:**
    - Method: `POST`
    - URL: `http://localhost:6789/api/broadcast`
    - Headers: Add `Authorization: Bearer <token>`

## 🏗️ Architecture

### System Design

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │◄───────►│   Server     │◄───────►│    Redis    │
│  (Browser)  │  WebSocket│  (Node.js)  │  Pub/Sub │  (Broker)   │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              ▼
                        ┌──────────────┐
                        │  REST API    │
                        │  (Express)   │
                        └──────────────┘
```

### Key Components

1. **WebSocket Server** - Manages real-time connections grouped by `device_id`
2. **Redis Channel Layer** - Message broker for cross-server communication
3. **REST API** - JWT-secured endpoints for triggering notifications
4. **Device Groups** - Redis channels (`channel_{device_id}`) for targeted delivery

### Connection Flow

1. Client connects with `device_id` query parameter
2. Server stores WebSocket connection in device map
3. Server subscribes to Redis channel `channel_{device_id}`
4. REST API publishes to Redis channel
5. Redis delivers message to all server instances
6. Server sends message to matching device connection(s)

## 📡 Message Types

### Server → Client

**Welcome Message:**

```json
{
    "type": "welcome",
    "message": "Connected to WebSocket server!",
    "device_id": "roku_001",
    "server_id": 12345,
    "timestamp": "2026-04-17T10:30:00.000Z"
}
```

**Verification (every 5 seconds):**

```json
{
    "verification": true,
    "timestamp": "2026-04-17T10:30:05.000Z"
}
```

**Targeted Notification:**

```json
{
    "type": "notification",
    "message": "Your message",
    "device_id": "roku_001",
    "data": {},
    "timestamp": "2026-04-17T10:30:00.000Z"
}
```

**Broadcast:**

```json
{
    "type": "broadcast",
    "message": "Message to all devices",
    "data": {},
    "timestamp": "2026-04-17T10:30:00.000Z",
    "broadcast": true
}
```

## 🔧 Configuration

### Environment Variables

| Variable     | Description               | Default                                |
| ------------ | ------------------------- | -------------------------------------- |
| `PORT`       | Server port               | `6789`                                 |
| `REDIS_URL`  | Redis connection string   | `redis://localhost:6379`               |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key-change-in-production` |

### Example `.env` File

```env
PORT=6789
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key-change-this
```

## 🧪 Testing

Run the included test script:

```bash
node test-api.js
```

This will:

-   Generate a JWT token
-   Send targeted notifications
-   Broadcast to all devices
-   Test authentication rejection

## 📱 Roku BrightScript Integration

```brightscript
function SendWebSocketNotification(deviceId, message, token)
    transfer = CreateObject("roURLTransfer")
    transfer.SetUrl("http://localhost:6789/api/notify/" + deviceId)
    transfer.AddHeader("Content-Type", "application/json")
    transfer.AddHeader("Authorization", "Bearer " + token)

    notification = {
        "message": message,
        "type": "notification",
        "data": {}
    }

    response = transfer.PostFromString(FormatJson(notification))
    return response
end function
```

## 🎨 Frontend Features

-   **Glassmorphism Design** - Modern dark UI with backdrop blur
-   **Animated Background** - Subtle moving grid pattern
-   **Tabbed Interface** - Live Chat and History tabs
-   **Real-time Updates** - Instant message display
-   **Message History** - Persistent log with clear functionality
-   **Connection Status** - Pulsing indicator with device info
-   **Responsive Design** - Works on all screen sizes

## 📊 Scaling

The Redis channel layer enables horizontal scaling:

-   Run multiple server instances behind a load balancer
-   Each instance manages its own WebSocket connections
-   Redis routes messages to the correct instance
-   No shared state between servers required

## 🔒 Security

-   JWT authentication on all REST endpoints
-   Token expiration support
-   Device-based isolation
-   Secure WebSocket connections (use WSS in production)

## 📝 Project Structure

```
Web-Socket/
├── server.js           # Main server file
├── client.html         # Frontend UI
├── package.json        # Dependencies and scripts
├── test-api.js         # API testing script
├── API_DOCS.md         # Detailed API documentation
└── README.md           # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Troubleshooting

### Port Already in Use

```bash
lsof -ti:6789 | xargs kill -9
npm start
```

### Redis Connection Error

```bash
# Start Redis server
redis-server

# Or on some systems
sudo systemctl start redis-server
```

### WebSocket Connection Fails

-   Ensure server is running
-   Check Redis is active
-   Verify device_id parameter is included
-   Check browser console for errors

## 📞 Support

For issues and feature requests, please open an issue on the repository.

---

**Built with ❤️ using Node.js, WebSocket, and Redis**
