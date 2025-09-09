import { validationResult } from "express-validator";
import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";

export const getMenuByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { category, dietary, maxPrice, search } = req.query;

    // console.log("[v0] getMenuByRestaurant called with:", {
    //   restaurantId,
    //   category,
    //   dietary,
    //   maxPrice,
    //   search,
    // });

    const query = { restaurant: restaurantId, isAvailable: true };

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by dietary restrictions
    if (dietary) {
      query.dietary = { $in: dietary.split(",") };
    }

    // Filter by maximum price
    if (maxPrice) {
      query.price = { $lte: Number.parseFloat(maxPrice) };
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // console.log("[v0] Final query:", query);

    const menuItems = await MenuItem.find(query)
      .populate("restaurant", "name")
      .sort({ category: 1, name: 1 });

    // console.log("[v0] Found menu items:", menuItems.length);
    console.log(
      "[v0] Menu items:",
      menuItems.map((item) => ({
        name: item.name,
        isAvailable: item.isAvailable,
      }))
    );

    // Group by category
    const groupedMenu = menuItems.reduce((acc, item) => {
      const category = item.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});

    res.json({
      menuItems,
      groupedMenu,
    });
  } catch (error) {
    console.error("Get menu error:", error);
    res.status(500).json({ message: "Server error fetching menu" });
  }
};

export const createMenuItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    // console.log("Received menu item data:", req.body);

    // Check if user owns the restaurant
    const restaurant = await Restaurant.findById(req.body.restaurant);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    if (
      restaurant.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message: "Not authorized to add menu items to this restaurant",
      });
    }
    let imageValue = "";
    
    if (req.body.image && req.body.image.trim() !== "") {
      // Use the image URL from the request body
      imageValue = req.body.image;
      // console.log("Using image URL from request:", imageValue);
    } else if (req.file) {
      // Use uploaded file
      imageValue = `/uploads/${req.file.filename}`;
      // console.log("Using uploaded file:", imageValue);
    }

    const menuItemData = {
      ...req.body,
      image:
        req.body.image ||
        (req.file ? `/uploads/${req.file.filename}` : undefined),
    };

    const menuItem = new MenuItem(menuItemData);
    await menuItem.save();

    await menuItem.populate("restaurant", "name");

    res.status(201).json({
      message: "Menu item created successfully",
      menuItem,
    });
  } catch (error) {
    console.error("Create menu item error:", error);
    res.status(500).json({ message: "Server error creating menu item" });
  }
};

export const updateMenuItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const menuItem = await MenuItem.findById(req.params.id).populate(
      "restaurant"
    );

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    // Check if user owns the restaurant
    if (
      menuItem.restaurant.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this menu item" });
    }

    const updateData = { ...req.body };
    if (req.body.image) {
      updateData.image = req.body.image; // Use the URL from request body
    } else if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`; // Use uploaded file
    }

    Object.assign(menuItem, updateData);
    await menuItem.save();

    res.json({
      message: "Menu item updated successfully",
      menuItem,
    });
  } catch (error) {
    console.error("Update menu item error:", error);
    res.status(500).json({ message: "Server error updating menu item" });
  }
};

export const deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id).populate(
      "restaurant"
    );

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    // Check if user owns the restaurant
    if (
      menuItem.restaurant.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this menu item" });
    }

    await MenuItem.findByIdAndDelete(req.params.id);

    res.json({ message: "Menu item deleted successfully" });
  } catch (error) {
    console.error("Delete menu item error:", error);
    res.status(500).json({ message: "Server error deleting menu item" });
  }
};

export const getMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id).populate(
      "restaurant",
      "name address phone"
    );

    if (!menuItem || !menuItem.isAvailable) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.json({ menuItem });
  } catch (error) {
    console.error("Get menu item error:", error);
    res.status(500).json({ message: "Server error fetching menu item" });
  }
};
