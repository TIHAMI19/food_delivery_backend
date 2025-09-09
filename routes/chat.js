import express from "express"
import { authenticate } from "../middleware/auth.js"
import { ensureConversation, getMyConversations, getMessages, postMessage, markRead } from "../controllers/chatController.js"

const router = express.Router()

router.post("/ensure", authenticate, ensureConversation)
router.get("/conversations", authenticate, getMyConversations)
router.get("/conversations/:id/messages", authenticate, getMessages)
router.post("/conversations/:id/messages", authenticate, postMessage)
router.post("/conversations/:id/read", authenticate, markRead)

export default router
