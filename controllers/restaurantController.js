// import { validationResult } from "express-validator"
// import Restaurant from "../models/Restaurant.js"
// import MenuItem from "../models/MenuItem.js"

// export const getAllRestaurants = async (req, res) => {
//   try {
//     const { page = 1, limit = 12, cuisine, location, rating, priceRange, search, owner } = req.query

//     const query = { isActive: true }

//     if (owner) {
//       query.owner = owner
//     }

//     if (cuisine) {
//       if (Array.isArray(cuisine)) {
//         query.cuisine = { $in: cuisine }
//       } else if (typeof cuisine === "string") {
//         query.cuisine = { $in: cuisine.split(",") }
//       }
//     }

//     if (priceRange) {
//       if (Array.isArray(priceRange)) {
//         query.priceRange = { $in: priceRange }
//       } else if (typeof priceRange === "string") {
//         query.priceRange = { $in: priceRange.split(",") }
//       }
//     }

//     // Filter by minimum rating
//     if (rating) {
//       query.rating = { $gte: Number.parseFloat(rating) }
//     }

//     // Text search
//     if (search) {
//       query.$text = { $search: search }
//     }

//     // Location-based search (if coordinates provided)
//     if (location) {
//       const [lng, lat] = location.split(",").map(Number)
//       if (!isNaN(lat) && !isNaN(lng)) {
//         query["address.coordinates"] = {
//           $near: {
//             $geometry: { type: "Point", coordinates: [lng, lat] },
//             $maxDistance: 10000, // 10km radius
//           },
//         }
//       }
//     }

//     const restaurants = await Restaurant.find(query)
//       .populate("owner", "name email")
//       .sort({ rating: -1, totalReviews: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit)

//     const total = await Restaurant.countDocuments(query)

//     res.json({
//       restaurants,
//       totalPages: Math.ceil(total / limit),
//       currentPage: page,
//       total,
//     })
//   } catch (error) {
//     console.error("Get restaurants error:", error)
//     res.status(500).json({ message: "Server error fetching restaurants" })
//   }
// }

// export const getRestaurantById = async (req, res) => {
//   try {
//     const restaurant = await Restaurant.findById(req.params.id).populate("owner", "name email")

//     if (!restaurant || !restaurant.isActive) {
//       return res.status(404).json({ message: "Restaurant not found" })
//     }

//     // Get menu items for this restaurant
//     const menuItems = await MenuItem.find({ restaurant: restaurant._id, isAvailable: true }).sort({
//       category: 1,
//       name: 1,
//     })

//     res.json({
//       restaurant,
//       menuItems,
//     })
//   } catch (error) {
//     console.error("Get restaurant error:", error)
//     res.status(500).json({ message: "Server error fetching restaurant" })
//   }
// }

// export const createRestaurant = async (req, res) => {
//   try {
//     const errors = validationResult(req)
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         message: "Validation failed",
//         errors: errors.array(),
//       })
//     }

//     const restaurantData = {
//       ...req.body,
//       owner: req.user._id,
//       image: req.file ? `/uploads/${req.file.filename}` : undefined,
//     }

//     const restaurant = new Restaurant(restaurantData)
//     await restaurant.save()

//     res.status(201).json({
//       message: "Restaurant created successfully",
//       restaurant,
//     })
//   } catch (error) {
//     console.error("Create restaurant error:", error)
//     res.status(500).json({ message: "Server error creating restaurant" })
//   }
// }

// export const updateRestaurant = async (req, res) => {
//   try {
//     const errors = validationResult(req)
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         message: "Validation failed",
//         errors: errors.array(),
//       })
//     }

//     const restaurant = await Restaurant.findById(req.params.id)

//     if (!restaurant) {
//       return res.status(404).json({ message: "Restaurant not found" })
//     }

//     // Check if user owns this restaurant or is admin
//     if (restaurant.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
//       return res.status(403).json({ message: "Not authorized to update this restaurant" })
//     }

//     const updateData = { ...req.body }
//     if (req.file) {
//       updateData.image = `/uploads/${req.file.filename}`
//     }

//     Object.assign(restaurant, updateData)
//     await restaurant.save()

//     res.json({
//       message: "Restaurant updated successfully",
//       restaurant,
//     })
//   } catch (error) {
//     console.error("Update restaurant error:", error)
//     res.status(500).json({ message: "Server error updating restaurant" })
//   }
// }

// export const deleteRestaurant = async (req, res) => {
//   try {
//     const restaurant = await Restaurant.findById(req.params.id)

//     if (!restaurant) {
//       return res.status(404).json({ message: "Restaurant not found" })
//     }

//     // Check if user owns this restaurant or is admin
//     if (restaurant.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
//       return res.status(403).json({ message: "Not authorized to delete this restaurant" })
//     }

//     // Soft delete by setting isActive to false
//     restaurant.isActive = false
//     await restaurant.save()

//     res.json({ message: "Restaurant deleted successfully" })
//   } catch (error) {
//     console.error("Delete restaurant error:", error)
//     res.status(500).json({ message: "Server error deleting restaurant" })
//   }
// }

import { validationResult } from "express-validator";
import Restaurant from "../models/Restaurant.js";
import MenuItem from "../models/MenuItem.js";

export const getAllRestaurants = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      cuisine,
      location,
      rating,
      priceRange,
      search,
      owner,
    } = req.query;

    const query = { isActive: true };

    if (owner) {
      query.owner = owner;
    }

    if (cuisine) {
      if (Array.isArray(cuisine)) {
        query.cuisine = { $in: cuisine };
      } else if (typeof cuisine === "string") {
        query.cuisine = { $in: cuisine.split(",") };
      }
    }

    if (priceRange) {
      if (Array.isArray(priceRange)) {
        query.priceRange = { $in: priceRange };
      } else if (typeof priceRange === "string") {
        query.priceRange = { $in: priceRange.split(",") };
      }
    }

    // Filter by minimum rating
    if (rating) {
      query.rating = { $gte: Number.parseFloat(rating) };
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Location-based search (if coordinates provided)
    if (location) {
      const [lng, lat] = location.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        query["address.location"] = {
          $near: {
            $geometry: { type: "Point", coordinates: [lng, lat] },
            $maxDistance: 10000, // 10km radius
          },
        };
      }
    }

    const restaurants = await Restaurant.find(query)
      .populate("owner", "name email")
      .sort({ rating: -1, totalReviews: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Restaurant.countDocuments(query);

    res.json({
      restaurants,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Get restaurants error:", error);
    res.status(500).json({ message: "Server error fetching restaurants" });
  }
};

export const getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate(
      "owner",
      "name email"
    );

    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Get menu items for this restaurant
    const menuItems = await MenuItem.find({
      restaurant: restaurant._id,
      isAvailable: true,
    }).sort({
      category: 1,
      name: 1,
    });

    res.json({
      restaurant,
      menuItems,
    });
  } catch (error) {
    console.error("Get restaurant error:", error);
    res.status(500).json({ message: "Server error fetching restaurant" });
  }
};

export const createRestaurant = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    // Extract and parse nested objects from the request body
    const {
      name,
      description,
      cuisine,
      address,
      phone,
      email,
      rating,
      totalReviews,
      priceRange,
      deliveryTime,
      deliveryFee,
      minimumOrder,
      operatingHours,
      featuredItems,
      isActive,
      promotions,
      image,
    } = req.body;

    // console.log(req.body);

    // Parse nested objects if they came as strings
    const parsedAddress =
      typeof address === "string" ? JSON.parse(address) : address;
    const parsedOperatingHours =
      typeof operatingHours === "string"
        ? JSON.parse(operatingHours)
        : operatingHours;
    const parsedFeaturedItems =
      typeof featuredItems === "string"
        ? JSON.parse(featuredItems)
        : featuredItems;
    const parsedDeliveryTime =
      typeof deliveryTime === "string"
        ? JSON.parse(deliveryTime)
        : deliveryTime;

    // Build address and ensure GeoJSON location is set from coordinates
  const coords = parsedAddress?.coordinates || { lat: 0, lng: 0 };
    const restaurantData = {
      name,
      description,
      cuisine,
      address: {
        ...parsedAddress,
        location: {
          type: "Point",
          coordinates: [Number(coords.lng) || 0, Number(coords.lat) || 0],
        },
      },
      phone,
      email,
      rating: rating ? Number.parseFloat(rating) : 0,
      totalReviews: totalReviews ? Number.parseInt(totalReviews) : 0,
      priceRange,
      deliveryTime: parsedDeliveryTime,
      deliveryFee: deliveryFee ? Number.parseFloat(deliveryFee) : 0,
      minimumOrder: minimumOrder ? Number.parseFloat(minimumOrder) : 0,
      operatingHours: parsedOperatingHours,
      featuredItems: parsedFeaturedItems,
      isActive: isActive !== undefined ? isActive : true,
      promotions: Array.isArray(promotions)
        ? promotions.filter((promo) => promo.trim() !== "")
        : [],
      image: image || undefined,
      owner: req.user._id, // Set owner from authenticated user
    };
    console.log("Creating restaurant with image:", image);

    const restaurant = new Restaurant(restaurantData);
    await restaurant.save();

    res.status(201).json({
      message: "Restaurant created successfully",
      restaurant,
    });
  } catch (error) {
    console.error("Create restaurant error:", error);

    // More specific error messages
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid data format",
        error: error.message,
      });
    }

    res.status(500).json({ message: "Server error creating restaurant" });
  }
};

export const updateRestaurant = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Check if user owns this restaurant or is admin
    if (
      restaurant.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this restaurant" });
    }

    // Extract data from request body
    const updateData = { ...req.body };

    // Handle image update - prefer uploaded file, else allow provided URL, else keep existing
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    } else if (req.body.image) {
      updateData.image = req.body.image;
    }

    // If coordinates are provided in update, recompute GeoJSON location
    if (updateData.address?.coordinates) {
      const { lat, lng } = updateData.address.coordinates;
      if (typeof lat !== "undefined" && typeof lng !== "undefined") {
        updateData.address.location = {
          type: "Point",
          coordinates: [Number(lng), Number(lat)],
        };
      }
    }

    Object.assign(restaurant, updateData);
    await restaurant.save();

    res.json({
      message: "Restaurant updated successfully",
      restaurant,
    });
  } catch (error) {
    console.error("Update restaurant error:", error);
    res.status(500).json({ message: "Server error updating restaurant" });
  }
};

export const deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Check if user owns this restaurant or is admin
    if (
      restaurant.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this restaurant" });
    }

    // Soft delete by setting isActive to false
    restaurant.isActive = false;
    await restaurant.save();

    res.json({ message: "Restaurant deleted successfully" });
  } catch (error) {
    console.error("Delete restaurant error:", error);
    res.status(500).json({ message: "Server error deleting restaurant" });
  }
};
