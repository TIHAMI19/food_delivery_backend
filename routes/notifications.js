import express from "express"
import { authenticate } from "../middleware/auth.js"
import Notification from "../models/Notification.js"

const router = express.Router()

// List recent notifications for current user
router.get("/", authenticate, async (req, res) => {
  try {
    const { limit = 10 } = req.query
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean()
    res.json({ notifications })
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch notifications" })
  }
})

// Mark all as read
router.post("/read-all", authenticate, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } })
    res.json({ message: "All notifications marked as read" })
  } catch (e) {
    res.status(500).json({ message: "Failed to mark notifications as read" })
  }
})

export default router
