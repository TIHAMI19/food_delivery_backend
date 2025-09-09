import express from "express"
import { body, query, param } from "express-validator"
import { authenticate, authorize } from "../middleware/auth.js"
import { createCoupon, listCoupons, validateCoupon, deleteCoupon } from "../controllers/couponController.js"

const router = express.Router()

// Admin: create coupon
router.post(
  "/",
  authenticate,
  authorize("admin"),
  [
    body("code").isString().trim().toUpperCase().isLength({ min: 3, max: 20 }),
    body("type").isIn(["percent", "amount"]),
    body("value").isFloat({ gt: 0 }),
    body("minOrderAmount").optional().isFloat({ min: 0 }),
    body("maxDiscount").optional().isFloat({ min: 0 }),
    body("startsAt").optional().isISO8601(),
    body("expiresAt").optional().isISO8601(),
    body("usageLimit").optional().isInt({ min: 0 }),
    body("restaurant").optional().isMongoId(),
    body("isActive").optional().isBoolean(),
  ],
  createCoupon,
)

// Admin: list coupons
router.get("/", authenticate, authorize("admin"), listCoupons)

// Public: validate coupon applicability
router.get(
  "/validate",
  [
    query("code").isString(),
    query("subtotal").isFloat({ min: 0 }),
    query("restaurantId").optional().isMongoId(),
  ],
  validateCoupon,
)

// Admin: delete coupon
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  [param("id").isMongoId()],
  deleteCoupon,
)

export default router
