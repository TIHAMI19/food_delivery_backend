import express from "express";
import { body } from "express-validator";
import {
  getReviewsByRestaurant,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  getMyReviewForRestaurant,
  getMyReviewForOrder,
} from "../controllers/reviewController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// Validation rules
const reviewValidation = [
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("comment")
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Comment must be between 10 and 500 characters"),
  body("images").optional().isArray().withMessage("Images must be an array"),
];

// Create-specific validation: require orderId
const createReviewValidation = [
  ...reviewValidation,
  body("orderId").isMongoId().withMessage("Valid orderId is required"),
];

// Routes
router.get("/restaurant/:id", getReviewsByRestaurant);
router.get(
  "/restaurant/:restaurantId/my",
  authenticate,
  authorize("customer", "admin"),
  getMyReviewForRestaurant
);
router.get(
  "/order/:orderId/my",
  authenticate,
  authorize("customer", "admin"),
  getMyReviewForOrder
);
router.post(
  "/restaurant/:restaurantId",
  authenticate,
  authorize("customer", "admin"),
  createReviewValidation,
  createReview
);
router.put(
  "/:id",
  authenticate,
  authorize("customer", "admin"),
  reviewValidation,
  updateReview
);
router.delete(
  "/:id",
  authenticate,
  authorize("customer", "admin"),
  deleteReview
);
router.post("/:id/helpful", authenticate, markHelpful);

export default router;