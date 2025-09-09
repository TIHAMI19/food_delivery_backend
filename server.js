import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import mongoose from "mongoose"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"
import http from "http"
import { Server as SocketIOServer } from "socket.io"
import jwt from "jsonwebtoken"
import User from "./models/User.js"
import Conversation from "./models/Conversation.js"
import Review from "./models/Review.js"

// Import routes
import authRoutes from "./routes/auth.js"
import restaurantRoutes from "./routes/restaurants.js"
import menuRoutes from "./routes/menu.js"
import orderRoutes from "./routes/orders.js"
import searchRoutes from "./routes/search.js"
import reviewRoutes from "./routes/reviews.js";
import chatRoutes from "./routes/chat.js";
import marketingRoutes from "./routes/marketing.js";
import notificationRoutes from "./routes/notifications.js";
import couponRoutes from "./routes/coupons.js";

dotenv.config()

const app = express()
const httpServer = http.createServer(app)
const PORT = process.env.PORT || 5000

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Security middleware
app.use(helmet())

// CORS origins (allow multiple via CORS_ORIGINS comma-separated)
const extraCors = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:5173", // Vite default port
  ...extraCors,
]

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})
app.use(limiter)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

const uploadsDir = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/food-delivery")
  .then(async () => {
    console.log("Connected to MongoDB")
    try {
      // Align indexes with schema (drops obsolete ones like user+restaurant unique)
      await Review.syncIndexes()
      console.log("Review indexes synced")
    } catch (e) {
      console.error("Review index sync error:", e?.message || e)
    }
  })
  .catch((err) => console.error("MongoDB connection error:", err))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/restaurants", restaurantRoutes)
app.use("/api/menu", menuRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/search", searchRoutes)
app.use("/api/reviews", reviewRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/marketing", marketingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/coupons", couponRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" })
})

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
})

// Make available in controllers
global.io = io

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace("Bearer ", "")
    if (!token) return next(new Error("Unauthorized"))
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select("_id role isActive")
    if (!user || !user.isActive) return next(new Error("Unauthorized"))
    socket.user = user
    next()
  } catch (err) {
    next(new Error("Unauthorized"))
  }
})

io.on("connection", (socket) => {
  // Join a user-specific room for targeted notifications
  try {
    const userRoom = String(socket.user._id)
    if (userRoom) socket.join(userRoom)
  } catch {}

  socket.on("chat:join", async (conversationId) => {
    try {
      const convo = await Conversation.findById(conversationId)
      if (!convo) return
      const userId = String(socket.user._id)
      if (String(convo.customer) !== userId && String(convo.admin) !== userId) return
      socket.join(String(convo._id))
    } catch {}
  })
})

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
