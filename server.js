const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");

// Load environment variables
dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root welcome endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Product CRUD RESTful API asdf",
    endpoints: {
      health: "GET /health",
      getAllProducts: "GET /api/products",
      getProductByPid: "GET /api/products/:pid",
      createProduct: "POST /api/products",
      updateProduct: "PUT /api/products/:pid",
      deleteProduct: "DELETE /api/products/:pid",
    },
  });
});

// Health check endpoint (MongoDB + Product API)
app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  // mongoose readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const isDbConnected = dbState === 1;

  const healthData = {
    status: isDbConnected ? "OK" : "DEGRADED",
    service: "product-api",
    database: isDbConnected ? "connected" : "disconnected",
    dbReadyState: dbState,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  if (isDbConnected) {
    return res.status(200).json(healthData);
  } else {
    return res.status(503).json(healthData);
  }
});

// Product API routes
app.use("/api/products", productRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
});

// Start server only when run directly (not imported during tests)
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Server running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`);
        console.log(`🩺 Healthcheck available at: http://localhost:${PORT}/health`);
      });
    })
    .catch((err) => {
      console.error("Failed to start server due to DB connection error:", err.message);
    });
}

module.exports = app;
