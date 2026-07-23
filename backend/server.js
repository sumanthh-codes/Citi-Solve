import express from "express";
import cors from "cors";
import "dotenv/config";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import authRouter from "./src/routes/authroutes.js";
import getlocation from "./src/routes/geocode.js";
import complaintRouter from "./src/routes/complaintRoutes.js";
import { multerErrorHandler } from "./src/middleware/errorhandler.js";
import supportRouter from "./src/routes/supportRoutes.js";
import staffRouter from "./src/routes/staffroutes.js";
import adminRouter from "./src/routes/adminroutes.js";
import { logger } from "./src/utils/logger.js";

const app = express();
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  app.set("trust proxy", 1);
}

// =============================================
// MongoDB Connection Cache (for Vercel serverless)
// =============================================
let cachedConnection = null;

const connectDB = async () => {
  // If already connected, reuse the connection
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // New connection
  cachedConnection = await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  logger.info("✅ MongoDB connected");
  return cachedConnection;
};

// =============================================
// Middleware
// =============================================
app.use(helmet());

app.use(cors({
  origin: process.env.FRONT_END_URL,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Ensure DB is connected before every request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    logger.error("❌ MongoDB connection failed:", err.message);
    res.status(500).json({ success: false, message: "Database connection failed. Please try again." });
  }
});

// =============================================
// Routes
// =============================================
app.use("/api/geocode", getlocation);
app.use("/api/auth", authRouter);
app.use("/api/complaints", complaintRouter);
app.use("/api/support", supportRouter);
app.use("/api/staff", staffRouter);
app.use("/api/admin", adminRouter);
app.use(multerErrorHandler);

app.get("/", (req, res) => {
  res.send("API WORKING");
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: !isProd ? err.message : undefined,
  });
});

// Local dev server
if (!isProd) {
  const PORT = process.env.PORT || 3000;
  connectDB().then(() => {
    app.listen(PORT, () => logger.info(`Server running on ${PORT}`));
  });
}

export default app;