const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "afterwords-default-jwt-secret-key-12345";

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files if they exist in production
const frontendDistPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendDistPath));

// Auth Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const users = await db.query("SELECT id, email, name, subscription_status, last_check_in, check_in_interval_days, is_active FROM users WHERE id = ?", [decoded.userId]);
    
    if (users.length === 0) {
      return res.status(403).json({ error: "User not found or disabled" });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// --- AUTH ENDPOINTS ---

// Register
app.post("/api/auth/signup", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, password, and name are required" });
  }

  try {
    // Check if user already exists
    const existing = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    await db.execute(
      "INSERT INTO users (id, email, password_hash, name, created_at, last_check_in) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
      [userId, email, passwordHash, name]
    );

    // Auto check-in upon registration
    await db.execute(
      "INSERT INTO check_ins (id, user_id, checked_in_at) VALUES (?, ?, datetime('now'))",
      [crypto.randomUUID(), userId]
    );

    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "30d" });

    res.status(201).json({
      token,
      user: {
        id: userId,
        email,
        name,
        subscription_status: "free",
        check_in_interval_days: 30,
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error during registration" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const users = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });

    // Update last login / last check in
    await db.execute(
      "UPDATE users SET last_check_in = datetime('now') WHERE id = ?",
      [user.id]
    );
    await db.execute(
      "INSERT INTO check_ins (id, user_id, checked_in_at) VALUES (?, ?, datetime('now'))",
      [crypto.randomUUID(), user.id]
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscription_status: user.subscription_status,
        check_in_interval_days: user.check_in_interval_days,
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

// Get Current User
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});


// --- MESSAGES ENDPOINTS ---

// Get all messages for current user
app.get("/api/messages", authenticateToken, async (req, res) => {
  try {
    const messages = await db.query(
      "SELECT m.*, GROUP_CONCAT(r.name || ' <' || r.email || '>') as recipients_list " +
      "FROM messages m " +
      "LEFT JOIN recipients r ON m.id = r.message_id " +
      "WHERE m.user_id = ? " +
      "GROUP BY m.id " +
      "ORDER BY m.created_at DESC",
      [req.user.id]
    );
    res.json(messages);
  } catch (error) {
    console.error("Fetch messages error:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Create a new message with optional recipients
app.post("/api/messages", authenticateToken, async (req, res) => {
  const { subject, content, status = "draft", recipients = [] } = req.body;

  if (!subject || !content) {
    return res.status(400).json({ error: "Subject and content are required" });
  }

  const messageId = crypto.randomUUID();

  try {
    // Insert message
    await db.execute(
      "INSERT INTO messages (id, user_id, subject, content, created_at, updated_at, status) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), ?)",
      [messageId, req.user.id, subject, content, status]
    );

    // Insert recipients
    for (const recipient of recipients) {
      if (recipient.name && recipient.email) {
        await db.execute(
          "INSERT INTO recipients (id, message_id, name, email, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
          [crypto.randomUUID(), messageId, recipient.name, recipient.email]
        );
      }
    }

    res.status(201).json({ id: messageId, subject, content, status, recipients });
  } catch (error) {
    console.error("Create message error:", error);
    res.status(500).json({ error: "Failed to create message" });
  }
});


// --- CHECK-IN ENDPOINTS ---

// Trigger Manual Check-In
app.post("/api/check-ins", authenticateToken, async (req, res) => {
  try {
    const checkInId = crypto.randomUUID();
    await db.execute(
      "INSERT INTO check_ins (id, user_id, checked_in_at) VALUES (?, ?, datetime('now'))",
      [checkInId, req.user.id]
    );

    await db.execute(
      "UPDATE users SET last_check_in = datetime('now') WHERE id = ?",
      [req.user.id]
    );

    res.json({ message: "Check-in successful", checked_in_at: new Date().toISOString() });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({ error: "Failed to log check-in" });
  }
});


// --- TRUSTED CONTACTS ENDPOINTS ---

// Get all trusted contacts for current user
app.get("/api/trusted-contacts", authenticateToken, async (req, res) => {
  try {
    const contacts = await db.query(
      "SELECT * FROM trusted_contacts WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json(contacts);
  } catch (error) {
    console.error("Fetch trusted contacts error:", error);
    res.status(500).json({ error: "Failed to fetch trusted contacts" });
  }
});

// Create a trusted contact
app.post("/api/trusted-contacts", authenticateToken, async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  const contactId = crypto.randomUUID();

  try {
    await db.execute(
      "INSERT INTO trusted_contacts (id, user_id, name, email, phone, is_verified, created_at) VALUES (?, ?, ?, ?, ?, 0, datetime('now'))",
      [contactId, req.user.id, name, email, phone || null]
    );
    res.status(201).json({ id: contactId, name, email, phone, is_verified: 0 });
  } catch (error) {
    console.error("Create trusted contact error:", error);
    res.status(500).json({ error: "Failed to create trusted contact" });
  }
});


// --- FRONTEND ROUTING FALLBACK ---
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"), (err) => {
    if (err) {
      res.status(404).send("API Endpoint not found / Frontend assets not built yet.");
    }
  });
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`AfterWords Server running on http://0.0.0.0:${PORT}`);
});
