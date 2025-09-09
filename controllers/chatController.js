import Conversation from "../models/Conversation.js"
import Message from "../models/Message.js"
import User from "../models/User.js"

// Ensure a conversation exists between the authenticated user and a target (admin or customer)
// POST /api/chat/ensure  (customer: no body, admin: { customerId })
export const ensureConversation = async (req, res) => {
	try {
		const me = req.user
		if (!me?.isActive) return res.status(401).json({ message: "Unauthorized" })

		let customerId
		let adminId

		if (me.role === "customer") {
			// Find any active admin (first one)
			const admin = await User.findOne({ role: "admin", isActive: true }).select("_id")
			if (!admin) return res.status(400).json({ message: "No admin available" })
			customerId = me._id
			adminId = admin._id
		} else if (me.role === "admin") {
			customerId = req.body?.customerId
			if (!customerId) return res.status(400).json({ message: "customerId is required" })
			adminId = me._id
		} else {
			return res.status(403).json({ message: "Only customers or admins can start a conversation" })
		}

		let convo = await Conversation.findOne({ customer: customerId, admin: adminId })
			.populate("customer", "name email")
			.populate("admin", "name email")

		if (!convo) {
			convo = await Conversation.create({ customer: customerId, admin: adminId })
			convo = await Conversation.findById(convo._id)
				.populate("customer", "name email")
				.populate("admin", "name email")
		}

		return res.json({ conversation: convo })
	} catch (err) {
		console.error("ensureConversation error:", err)
		return res.status(500).json({ message: "Failed to ensure conversation" })
	}
}

// GET /api/chat/conversations (mine)
export const getMyConversations = async (req, res) => {
	try {
		const me = req.user
		const filter = me.role === "admin" ? { admin: me._id } : { customer: me._id }
		const conversations = await Conversation.find(filter)
			.sort({ lastMessageAt: -1, updatedAt: -1 })
			.populate("customer", "name email")
			.populate("admin", "name email")

		return res.json({ conversations })
	} catch (err) {
		console.error("getMyConversations error:", err)
		return res.status(500).json({ message: "Failed to fetch conversations" })
	}
}

// GET /api/chat/conversations/:id/messages
export const getMessages = async (req, res) => {
	try {
		const me = req.user
		const { id } = req.params

		const convo = await Conversation.findById(id)
		if (!convo) return res.status(404).json({ message: "Conversation not found" })
		const isMember = String(convo.customer) === String(me._id) || String(convo.admin) === String(me._id)
		if (!isMember) return res.status(403).json({ message: "Forbidden" })

		const messages = await Message.find({ conversation: id }).sort({ createdAt: 1 })
		return res.json({ messages })
	} catch (err) {
		console.error("getMessages error:", err)
		return res.status(500).json({ message: "Failed to fetch messages" })
	}
}

// POST /api/chat/conversations/:id/messages  { content }
export const postMessage = async (req, res) => {
	try {
		const me = req.user
		const { id } = req.params
		const { content } = req.body
		if (!content || !content.trim()) return res.status(400).json({ message: "Message content is required" })

		const convo = await Conversation.findById(id)
		if (!convo) return res.status(404).json({ message: "Conversation not found" })
		const isMember = String(convo.customer) === String(me._id) || String(convo.admin) === String(me._id)
		if (!isMember) return res.status(403).json({ message: "Forbidden" })

		const receiver = String(convo.customer) === String(me._id) ? convo.admin : convo.customer
		let msg = await Message.create({ conversation: convo._id, sender: me._id, receiver, content: content.trim() })

		// Update conversation metadata
		convo.lastMessage = content.trim()
		convo.lastMessageAt = new Date()
		await convo.save()

		// Populate for client convenience
		msg = await Message.findById(msg._id)

		// Emit to room (conversation) and to receiver's user room
		try {
			global.io?.to(String(convo._id)).emit("chat:new_message", msg)
			global.io?.to(String(receiver)).emit("chat:new_message", msg)
		} catch (e) {
			// ignore socket errors
		}

		return res.status(201).json({ message: msg })
	} catch (err) {
		console.error("postMessage error:", err)
		return res.status(500).json({ message: "Failed to send message" })
	}
}

// POST /api/chat/conversations/:id/read
export const markRead = async (req, res) => {
	try {
		const me = req.user
		const { id } = req.params
		const convo = await Conversation.findById(id)
		if (!convo) return res.status(404).json({ message: "Conversation not found" })
		const isMember = String(convo.customer) === String(me._id) || String(convo.admin) === String(me._id)
		if (!isMember) return res.status(403).json({ message: "Forbidden" })

		const result = await Message.updateMany(
			{ conversation: id, receiver: me._id, readAt: null },
			{ $set: { readAt: new Date() } },
		)

		return res.json({ updated: result.modifiedCount || result.nModified || 0 })
	} catch (err) {
		console.error("markRead error:", err)
		return res.status(500).json({ message: "Failed to mark messages as read" })
	}
}
