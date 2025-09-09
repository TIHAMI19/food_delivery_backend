import mongoose from "mongoose"

const conversationSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastMessage: {
      type: String,
    },
    lastMessageAt: {
      type: Date,
    },
  },
  { timestamps: true },
)

conversationSchema.index({ customer: 1, admin: 1 }, { unique: true })

export default mongoose.model("Conversation", conversationSchema)
