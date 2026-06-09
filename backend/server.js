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
const app = express();
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  app.set("trust proxy", 1);
}

app.use(helmet());

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONT_END_URL,
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS blocked"));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

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

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: !isProd ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });