const axios = require("axios");

// ============ Configuration ============
const BASE_URL = "http://localhost:6789";
const JWT_SECRET = "your-secret-key-change-in-production";
const jwt = require("jsonwebtoken");

// Generate a test token
const token = jwt.sign({ user: "test_user" }, JWT_SECRET, { expiresIn: "1h" });
const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
};

// ============ Test Functions ============

// Test 1: Send targeted notification to specific device
async function sendToSpecificDevice(deviceId, message) {
    try {
        console.log(`\n📤 Sending notification to device: ${deviceId}`);
        const response = await axios.post(
            `${BASE_URL}/api/notify/${deviceId}`,
            {
                message: message,
                type: "notification",
                data: { source: "test_script" },
            },
            { headers }
        );
        console.log("✓ Success:", response.data);
    } catch (error) {
        console.error("✗ Error:", error.response?.data || error.message);
    }
}

// Test 2: Broadcast to all devices
async function broadcastToAll(message) {
    try {
        console.log(`\n📡 Broadcasting to all devices...`);
        const response = await axios.post(
            `${BASE_URL}/api/broadcast`,
            {
                message: message,
                type: "broadcast",
                data: { source: "test_script" },
            },
            { headers }
        );
        console.log("✓ Success:", response.data);
    } catch (error) {
        console.error("✗ Error:", error.response?.data || error.message);
    }
}

// ============ Run Tests ============
async function runTests() {
    console.log("=".repeat(60));
    console.log("🧪 Testing Targeted Notification System");
    console.log("=".repeat(60));
    console.log(`\n🔑 Token: ${token}`);
    console.log(`🌐 Server: ${BASE_URL}`);

    // Wait a moment for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 1: Send to specific device
    await sendToSpecificDevice("device_123", "Hello Device 123!");

    // Test 2: Send to another device
    await sendToSpecificDevice("device_456", "Message for Device 456");

    // Test 3: Broadcast to all
    await broadcastToAll("This is a broadcast message to ALL devices!");

    // Test 4: Send without auth (should fail)
    try {
        console.log("\n❌ Testing without authentication (should fail)...");
        await axios.post(`${BASE_URL}/api/notify/device_123`, {
            message: "Unauthorized message",
        });
    } catch (error) {
        console.log("✓ Correctly rejected:", error.response?.data?.error);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Tests completed!");
    console.log("=".repeat(60));
}

// Run the tests
runTests().catch(console.error);
