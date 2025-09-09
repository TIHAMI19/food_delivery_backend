import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["order_status"], required: true },
    payload: {
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
      status: { type: String, required: true },
      restaurant: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
        name: String,
      },
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
)

notificationSchema.index({ user: 1, createdAt: -1 })

export default mongoose.model("Notification", notificationSchema)
