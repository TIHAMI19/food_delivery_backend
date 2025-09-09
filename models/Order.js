import mongoose from "mongoose"

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuItem",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  specialInstructions: {
    type: String,
    maxlength: 200,
  },
})

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    items: [orderItemSchema],
    fulfillmentMethod: {
      type: String,
      enum: ["delivery", "pickup", "dine_in"],
      default: "delivery",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"],
      default: "pending",
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponCode: {
      type: String,
      default: null,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryAddress: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipCode: {
        type: String,
        required: true,
      },
      coordinates: {
        lat: Number,
        lng: Number,
      },
      instructions: String,
    },
    paymentMethod: {
      type: String,
      enum: ["credit_card", "debit_card", "paypal", "cash"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentDetails: {
      transactionId: { type: String },
      amount: { type: Number, min: 0 },
      currency: { type: String },
      raw: { type: Object },
    },
    // New: scheduling support
    orderType: {
      type: String,
      enum: ["instant", "scheduled"],
      default: "instant",
    },
    scheduledFor: {
      type: Date,
      default: null,
    },
    estimatedDeliveryTime: {
      type: Date,
      required: true,
    },
    actualDeliveryTime: Date,
    notes: String,
    cancellationReason: String,
  },
  {
    timestamps: true,
  },
)

// Generate order number before saving
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model("Order").countDocuments()
    this.orderNumber = `ORD${Date.now()}${String(count + 1).padStart(4, "0")}`
  }
  next()
})

// Indexes for efficient queries
orderSchema.index({ customer: 1, createdAt: -1 })
orderSchema.index({ restaurant: 1, createdAt: -1 })
orderSchema.index({ status: 1 })
orderSchema.index({ orderNumber: 1 })
orderSchema.index({ orderType: 1, scheduledFor: -1 })

export default mongoose.model("Order", orderSchema)
