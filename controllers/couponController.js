import { validationResult } from "express-validator"
import Coupon from "../models/Coupon.js"

export const createCoupon = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", errors: errors.array() })

    const data = {
      code: req.body.code,
      type: req.body.type,
      value: req.body.value,
      minOrderAmount: req.body.minOrderAmount || 0,
      maxDiscount: req.body.maxDiscount || 0,
      startsAt: req.body.startsAt ? new Date(req.body.startsAt) : undefined,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
      usageLimit: req.body.usageLimit || 0,
      isActive: req.body.isActive !== false,
      restaurant: req.body.restaurant || null,
      createdBy: req.user._id,
    }

    const exists = await Coupon.findOne({ code: data.code })
    if (exists) return res.status(400).json({ message: "Coupon code already exists" })

    const coupon = await Coupon.create(data)
    return res.status(201).json({ coupon })
  } catch (e) {
    console.error("createCoupon error", e)
    return res.status(500).json({ message: "Failed to create coupon" })
  }
}

export const listCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 })
    return res.json({ coupons })
  } catch (e) {
    console.error("listCoupons error", e)
    return res.status(500).json({ message: "Failed to fetch coupons" })
  }
}

export const validateCoupon = async (req, res) => {
  try {
    const { code, subtotal, restaurantId } = req.query
    const coupon = await Coupon.findOne({ code: String(code || "").toUpperCase() })
    if (!coupon) return res.status(404).json({ valid: false, reason: "Coupon not found" })
    const result = Coupon.computeDiscount({ coupon, subtotal: Number(subtotal) || 0, restaurantId })
    return res.json({ coupon, ...result })
  } catch (e) {
    console.error("validateCoupon error", e)
    return res.status(500).json({ message: "Failed to validate coupon" })
  }
}

export const deleteCoupon = async (req, res) => {
  try {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", errors: errors.array() })
    const { id } = req.params
    const deleted = await Coupon.findByIdAndDelete(id)
    if (!deleted) return res.status(404).json({ message: "Coupon not found" })
    return res.json({ message: "Coupon deleted", id })
  } catch (e) {
    console.error("deleteCoupon error", e)
    return res.status(500).json({ message: "Failed to delete coupon" })
  }
}
