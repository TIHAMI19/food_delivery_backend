import express from "express"
import { body } from "express-validator"
import {
  getMenuByRestaurant,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getMenuItem,
} from "../controllers/menuController.js"
import { authenticate, authorize } from "../middleware/auth.js"
import { upload } from "../middleware/upload.js"

const router = express.Router()

// Validation rules
const menuItemValidation = [
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Menu item name must be between 2 and 100 characters"),
  body("description")
    .trim()
    .isLength({ min: 10, max: 300 })
    .withMessage("Description must be between 10 and 300 characters"),
  body("restaurant").isMongoId().withMessage("Valid restaurant ID is required"),
  body("category")
    .isIn([
      "Appetizers",
      "Main Course",
      "Desserts",
      "Beverages",
      "Salads",
      "Soups",
      "Sides",
      "Breakfast",
      "Lunch",
      "Dinner",
      "Snacks",
    ])
    .withMessage("Valid category is required"),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("preparationTime").isInt({ min: 5, max: 60 }).withMessage("Preparation time must be between 5 and 60 minutes"),
]

// Routes
router.get("/:restaurantId", getMenuByRestaurant)
router.get("/item/:id", getMenuItem)
router.post(
  "/",
  authenticate,
  authorize("restaurant_owner", "admin"),
  upload.single("image"),
  menuItemValidation,
  createMenuItem,
)
router.put(
  "/:id",
  authenticate,
  authorize("restaurant_owner", "admin"),
  upload.single("image"),
  menuItemValidation,
  updateMenuItem,
)
router.delete("/:id", authenticate, authorize("restaurant_owner", "admin"), deleteMenuItem)

export default router
