const WebSocket = require("ws");
const http = require("http");
const express = require("express");
const Redis = require("ioredis");
const jwt = require("jsonwebtoken");
const path = require("path");

// ============ Configuration ============
const PORT = process.env.PORT || 6789;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const JWT_SECRET =
    process.env.JWT_SECRET || "your-secret-key-change-in-production";

// ============ Redis Channel Layer ============
// Redis acts as the message broker - allows scaling across multiple server instances
const redis = new Redis(REDIS_URL);
const redisSubscriber = new Redis(REDIS_URL); // Separate connection for subscribing

console.log("✓ Redis channel layer initialized");

// ============ Express HTTP Server ============
const app = express();
app.use(express.json());

// Serve static client
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "client.html"));
});

// ============ JWT Authentication Middleware ============
const jwtRequired = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authorization token required" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: "Invalid or expired token" });
    }
};

// ============ REST API - Trigger Endpoint ============
// This is how you push notifications to specific devices
app.post("/api/notify/:device_id", jwtRequired, async (req, res) => {
    const { device_id } = req.params;
    const { message, type = "notification", data = {} } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    const groupChannel = `channel_${device_id}`;
    const notification = {
        type,
        message,
        data,
        device_id,
        timestamp: new Date().toISOString(),
        server_id: process.pid, // For debugging which server instance handled it
    };

    try {
        // Publish to Redis channel - any server instance can receive this
        await redis.publish(groupChannel, JSON.stringify(notification));

        console.log(`✓ Published to ${groupChannel}: ${message}`);

        res.json({
            success: true,
            message: "Notification sent",
            target: device_id,
            timestamp: notification.timestamp,
        });
    } catch (error) {
        console.error("✗ Failed to publish notification:", error);
        res.status(500).json({ error: "Failed to send notification" });
    }
});

// Broadcast endpoint - send to all connected devices
app.post("/api/broadcast", jwtRequired, async (req, res) => {
    const { message, type = "broadcast", data = {} } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    const notification = {
        type,
        message,
        data,
        timestamp: new Date().toISOString(),
        broadcast: true,
    };

    try {
        // Publish to broadcast channel
        await redis.publish("broadcast_all", JSON.stringify(notification));

        console.log(`✓ Broadcast to all devices: ${message}`);

        res.json({
            success: true,
            message: "Broadcast sent",
            timestamp: notification.timestamp,
        });
    } catch (error) {
        console.error("✗ Failed to broadcast:", error);
        res.status(500).json({ error: "Failed to broadcast" });
    }
});

// ============ Create HTTP + WebSocket Server ============
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ============ Connection Store (for this server instance only) ============
// Maps device_id -> Set of WebSocket connections (a device can have multiple connections)
const deviceConnections = new Map();

server.listen(PORT, () => {
    console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
    console.log(`🔑 JWT Secret: ${JWT_SECRET}`);
    console.log(`\n📖 Test endpoints:`);
    console.log(`   POST http://localhost:${PORT}/api/notify/:device_id`);
    console.log(`   POST http://localhost:${PORT}/api/broadcast`);
    console.log(
        `\n💡 Remember to include Authorization: Bearer <token> header\n`
    );
});

// ============ Redis Subscriber - Listen for messages from other server instances ============
redisSubscriber.subscribe("broadcast_all", (err) => {
    if (err) {
        console.error("✗ Failed to subscribe to broadcast_all:", err);
    } else {
        console.log("✓ Subscribed to broadcast_all channel");
    }
});

redisSubscriber.on("message", (channel, message) => {
    try {
        const notification = JSON.parse(message);

        if (channel === "broadcast_all") {
            // Send to all connected clients on this server instance
            deviceConnections.forEach((connections) => {
                connections.forEach((ws) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(notification));
                    }
                });
            });
        } else if (channel.startsWith("channel_")) {
            const device_id = channel.replace("channel_", "");
            const connections = deviceConnections.get(device_id);

            if (connections) {
                // Send to all connections for this specific device
                connections.forEach((ws) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(notification));
                    }
                });
                console.log(
                    `✓ Delivered to device ${device_id} on this server`
                );
            }
        }
    } catch (error) {
        console.error("✗ Error processing Redis message:", error);
    }
});

// ============ WebSocket Connection Handler ============
wss.on("connection", (ws, req) => {
    // Extract device_id from URL query parameters
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const device_id =
        url.searchParams.get("device_id") || `anonymous_${Date.now()}`;
    const token = url.searchParams.get("token");

    console.log(`✓ New client connected: device_id=${device_id}`);

    // Add connection to device map
    if (!deviceConnections.has(device_id)) {
        deviceConnections.set(device_id, new Set());
    }
    deviceConnections.get(device_id).add(ws);

    // Send welcome message
    ws.send(
        JSON.stringify({
            type: "welcome",
            message: "Connected to WebSocket server!",
            device_id,
            server_id: process.pid,
            timestamp: new Date().toISOString(),
        })
    );

    // Send verification JSON every 5 seconds
    const verificationInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(
                JSON.stringify({
                    verification: true,
                    timestamp: new Date().toISOString(),
                })
            );
        }
    }, 5000);

    console.log(`⏱ Verification interval started for ${device_id} (every 5s)`);

    // Handle messages from client
    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`Received from ${device_id}:`, data.message);

            // Simple echo response for testing
            if (data.message && data.message.toLowerCase() === "hi") {
                ws.send(
                    JSON.stringify({
                        type: "response",
                        message: "hello",
                        device_id,
                        timestamp: new Date().toISOString(),
                    })
                );
            } else {
                ws.send(
                    JSON.stringify({
                        type: "echo",
                        message: data.message || message,
                        device_id,
                        timestamp: new Date().toISOString(),
                    })
                );
            }
        } catch (error) {
            const msg = message.toString();
            console.log(`Received raw from ${device_id}:`, msg);

            if (msg.toLowerCase() === "hi") {
                ws.send(
                    JSON.stringify({
                        type: "response",
                        message: "hello",
                        device_id,
                        timestamp: new Date().toISOString(),
                    })
                );
            }
        }
    });

    // Handle client disconnect
    ws.on("close", () => {
        console.log(`✗ Client disconnected: device_id=${device_id}`);

        // Clear the verification interval
        clearInterval(verificationInterval);
        console.log(`⏱ Verification interval cleared for ${device_id}`);

        const connections = deviceConnections.get(device_id);
        if (connections) {
            connections.delete(ws);
            if (connections.size === 0) {
                deviceConnections.delete(device_id);
            }
        }
    });

    // Handle errors
    ws.on("error", (error) => {
        console.error(`WebSocket error for ${device_id}:`, error);
    });
});

// Handle server errors
wss.on("error", (error) => {
    console.error("Server error:", error);
});

console.log("⏳ Waiting for connections...\n");
