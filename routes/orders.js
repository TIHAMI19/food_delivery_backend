import express from "express"
import { body } from "express-validator"
import {
  createOrder,
  getUserOrders,
  getAdminOrders,
  updateOrderStatus,
  getOrderById,
} from "../controllers/orderController.js"
import { authenticate, authorize } from "../middleware/auth.js"

const router = express.Router()

// Validation rules
const orderValidation = [
  body("restaurantId").isMongoId().withMessage("Valid restaurant ID is required"),
  body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
  body("items.*.menuItem").isMongoId().withMessage("Valid menu item ID is required"),
  body("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  body("deliveryAddress.street").notEmpty().withMessage("Delivery street address is required"),
  body("deliveryAddress.city").notEmpty().withMessage("Delivery city is required"),
  body("deliveryAddress.state").notEmpty().withMessage("Delivery state is required"),
  body("deliveryAddress.zipCode").notEmpty().withMessage("Delivery zip code is required"),
  body("paymentMethod")
    .isIn(["credit_card", "debit_card", "paypal", "cash"])
    .withMessage("Valid payment method is required"),
  body("fulfillmentMethod")
    .optional()
    .isIn(["delivery", "pickup", "dine_in"]) 
    .withMessage("fulfillmentMethod must be delivery, pickup, or dine_in"),
  body("orderType").optional().isIn(["instant", "scheduled"]).withMessage("Invalid order type"),
  body("scheduledFor")
    .optional()
    .custom((value, { req }) => {
      if (req.body.orderType === "scheduled") {
        if (!value) throw new Error("scheduledFor is required for scheduled orders")
        const when = new Date(value)
        if (Number.isNaN(when.getTime())) throw new Error("Invalid scheduled date/time")
      }
      return true
    }),
]

const statusValidation = [
  body("status")
    .isIn(["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"])
    .withMessage("Valid status is required"),
]

// Routes
router.post("/", authenticate, orderValidation, createOrder)
router.get("/", authenticate, getUserOrders)
router.get("/admin", authenticate, authorize("restaurant_owner", "admin"), getAdminOrders)
router.get("/:id", authenticate, getOrderById) // Added route for getting order by ID
router.put("/:id/status", authenticate, authorize("restaurant_owner", "admin"), statusValidation, updateOrderStatus)

export default router
