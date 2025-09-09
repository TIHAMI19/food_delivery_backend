import { validationResult } from "express-validator";
import mongoose from "mongoose";
import Review from "../models/Review.js";
import Restaurant from "../models/Restaurant.js";
import Order from "../models/Order.js";

export const getReviewsByRestaurant = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = "newest" } = req.query;
    const { id } = req.params;

    // Check if restaurant exists and is active
    const restaurant = await Restaurant.findOne({ _id: id, isActive: true });
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Build sort object
    let sortOptions = {};
    switch (sort) {
      case "newest":
        sortOptions = { createdAt: -1 };
        break;
      case "oldest":
        sortOptions = { createdAt: 1 };
        break;
      case "highest":
        sortOptions = { rating: -1, createdAt: -1 };
        break;
      case "lowest":
        sortOptions = { rating: 1, createdAt: -1 };
        break;
      case "most_helpful":
        sortOptions = { helpful: -1, createdAt: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const reviews = await Review.find({ restaurant: id, isActive: true })
      .populate("user", "name profilePicture")
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments({
      restaurant: id,
      isActive: true,
    });

    // Get average rating
    const averageRating = await Review.aggregate([
      {
        $match: { restaurant: new mongoose.Types.ObjectId(id), isActive: true },
      },
      { $group: { _id: "$restaurant", averageRating: { $avg: "$rating" } } },
    ]);

    res.json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      averageRating: averageRating[0]?.averageRating || 0,
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({ message: "Server error fetching reviews" });
  }
};

export const createReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { restaurantId } = req.params;
    const { rating, comment, images, orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "orderId is required to review" })
    }

    // Check if restaurant exists and is active
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      isActive: true,
    });
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Validate order belongs to user, matches restaurant, and is delivered
    const order = await Order.findOne({ _id: orderId, customer: req.user._id }).lean()
    if (!order) return res.status(404).json({ message: "Order not found" })
    if (String(order.restaurant) !== String(restaurantId)) {
      return res.status(400).json({ message: "Order does not belong to this restaurant" })
    }
    if (order.status !== "delivered") {
      return res.status(403).json({ message: "You can only review delivered orders" })
    }

    // Check if user has already reviewed this order
    const existingReview = await Review.findOne({ user: req.user._id, order: orderId })

    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this restaurant" });
    }

    const review = new Review({
      user: req.user._id,
  restaurant: restaurantId,
  order: orderId,
      rating,
      comment,
      images: images || [],
    });

    await review.save();

    // Update restaurant rating and total reviews
    await updateRestaurantRating(restaurantId);

    // Populate user info for response
    await review.populate("user", "name profilePicture");

    res.status(201).json({
      message: "Review created successfully",
      review,
    });
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ message: "Server error creating review" });
  }
};

export const getMyReviewForRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params
    const review = await Review.findOne({
      user: req.user._id,
      restaurant: restaurantId,
      isActive: true,
    })
    res.json({ review })
  } catch (error) {
    console.error("Get my review error:", error)
    res.status(500).json({ message: "Server error fetching review" })
  }
}

export const getMyReviewForOrder = async (req, res) => {
  try {
    const { orderId } = req.params
    const review = await Review.findOne({ user: req.user._id, order: orderId, isActive: true })
    res.json({ review })
  } catch (error) {
    console.error("Get my review for order error:", error)
    res.status(500).json({ message: "Server error fetching review" })
  }
}

export const updateReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { rating, comment, images } = req.body;

    const review = await Review.findById(id);

    if (!review || !review.isActive) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check if user owns this review
    if (review.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this review" });
    }

    review.rating = rating;
    review.comment = comment;
    review.images = images || [];

    await review.save();

    // Update restaurant rating
    await updateRestaurantRating(review.restaurant);

    await review.populate("user", "name profilePicture");

    res.json({
      message: "Review updated successfully",
      review,
    });
  } catch (error) {
    console.error("Update review error:", error);
    res.status(500).json({ message: "Server error updating review" });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);

    if (!review || !review.isActive) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check if user owns this review or is admin
    if (
      review.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this review" });
    }

    // Soft delete
    review.isActive = false;
    await review.save();

    // Update restaurant rating
    await updateRestaurantRating(review.restaurant);

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ message: "Server error deleting review" });
  }
};

export const markHelpful = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);

    if (!review || !review.isActive) {
      return res.status(404).json({ message: "Review not found" });
    }

    review.helpful += 1;
    await review.save();

    res.json({
      message: "Review marked as helpful",
      helpfulCount: review.helpful,
    });
  } catch (error) {
    console.error("Mark helpful error:", error);
    res.status(500).json({ message: "Server error marking review as helpful" });
  }
};

// Helper function to update restaurant rating
const updateRestaurantRating = async (restaurantId) => {
  try {
    const result = await Review.aggregate([
      {
        $match: {
          restaurant: new mongoose.Types.ObjectId(restaurantId),
          isActive: true,
        },
      },
      {
        $group: {
          _id: "$restaurant",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (result.length > 0) {
      await Restaurant.findByIdAndUpdate(restaurantId, {
        rating: parseFloat(result[0].averageRating.toFixed(1)),
        totalReviews: result[0].totalReviews,
      });
    }
  } catch (error) {
    console.error("Update restaurant rating error:", error);
  }
};
