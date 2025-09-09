import express from "express"
import { body } from "express-validator"
import {
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
} from "../controllers/restaurantController.js"
import { authenticate, authorize } from "../middleware/auth.js"
import { upload } from "../middleware/upload.js"

const router = express.Router()

// Validation rules
const restaurantValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Restaurant name must be between 2 and 100 characters"),
  body("description")
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Description must be between 10 and 500 characters"),
  body("cuisine").isArray({ min: 1 }).withMessage("At least one cuisine type is required"),
  body("address.street").notEmpty().withMessage("Street address is required"),
  body("address.city").notEmpty().withMessage("City is required"),
  body("address.state").notEmpty().withMessage("State is required"),
  body("address.zipCode").notEmpty().withMessage("Zip code is required"),
  body("address.coordinates.lat").isFloat({ min: -90, max: 90 }).withMessage("Valid latitude is required"),
  body("address.coordinates.lng").isFloat({ min: -180, max: 180 }).withMessage("Valid longitude is required"),
  body("phone")
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage("Valid phone number is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("priceRange").isIn(["$", "$$", "$$$", "$$$$"]).withMessage("Valid price range is required"),
  body("deliveryTime.min")
    .isInt({ min: 10, max: 120 })
    .withMessage("Minimum delivery time must be between 10 and 120 minutes"),
  body("deliveryTime.max")
    .isInt({ min: 10, max: 120 })
    .withMessage("Maximum delivery time must be between 10 and 120 minutes"),
  body("deliveryFee").isFloat({ min: 0 }).withMessage("Delivery fee must be a positive number"),
  body("minimumOrder").isFloat({ min: 0 }).withMessage("Minimum order must be a positive number"),
]

// Routes
router.get("/", getAllRestaurants)
router.get("/:id", getRestaurantById)
router.post(
  "/",
  authenticate,
  authorize("restaurant_owner", "admin"),
  upload.single("image"),
  restaurantValidation,
  createRestaurant,
)
router.put(
  "/:id",
  authenticate,
  authorize("restaurant_owner", "admin"),
  upload.single("image"),
  restaurantValidation,
  updateRestaurant,
)
router.delete("/:id", authenticate, authorize("restaurant_owner", "admin"), deleteRestaurant)

export default router
