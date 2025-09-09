import mongoose from "mongoose"

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["percent", "amount"], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: 0, min: 0 }, // 0 means no cap
    startsAt: { type: Date },
    expiresAt: { type: Date },
    usageLimit: { type: Number, default: 0, min: 0 }, // 0 means unlimited
    usedCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", default: null }, // null = all restaurants
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
)

couponSchema.index({ code: 1 })
couponSchema.index({ isActive: 1, expiresAt: 1 })

couponSchema.statics.computeDiscount = function ({ coupon, subtotal, restaurantId, now = new Date() }) {
  if (!coupon || !coupon.isActive) return { valid: false, reason: "Coupon inactive" }
  if (coupon.startsAt && now < coupon.startsAt) return { valid: false, reason: "Coupon not started" }
  if (coupon.expiresAt && now > coupon.expiresAt) return { valid: false, reason: "Coupon expired" }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return { valid: false, reason: "Coupon usage limit reached" }
  if (coupon.restaurant && restaurantId && String(coupon.restaurant) !== String(restaurantId)) {
    return { valid: false, reason: "Coupon not valid for this restaurant" }
  }
  if (subtotal < (coupon.minOrderAmount || 0)) return { valid: false, reason: `Minimum order ${coupon.minOrderAmount}` }

  let discount = 0
  if (coupon.type === "percent") discount = (subtotal * coupon.value) / 100
  else discount = coupon.value

  if (coupon.maxDiscount && coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount)
  discount = Math.max(0, Math.min(discount, subtotal))

  return { valid: true, discount }
}

export default mongoose.model("Coupon", couponSchema)
