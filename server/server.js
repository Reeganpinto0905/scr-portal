require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const courseRoutes = require("./routes/courseRoutes");
const registrationRoutes = require("./routes/registrationRoutes");

const app = express();

// Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/register", registrationRoutes);

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const clientDistPath = path.join(__dirname, "../client/dist");
  app.use(express.static(clientDistPath));

  app.get("(.*)", (req, res) => {
    // If request starts with /api, it's a 404 for API, not for static files
    if (req.url.startsWith("/api")) {
      return res.status(404).json({ message: "API route not found" });
    }
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error." });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    // Don't exit immediately, let the server handle requests (maybe with a 503)
  });

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use.`);
  } else {
    console.error("❌ Server error:", err.message);
  }
});
