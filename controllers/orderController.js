import { validationResult } from "express-validator";
import Order from "../models/Order.js";
import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";
import Review from "../models/Review.js";
import Notification from "../models/Notification.js";
import Coupon from "../models/Coupon.js";

// Generate a unique order number
const generateOrderNumber = async () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD${timestamp}${random}`;
};

export const createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

  const { restaurantId, items, deliveryAddress, paymentMethod, paymentStatus, paymentDetails, orderType = "instant", scheduledFor, fulfillmentMethod = "delivery", couponCode } = req.body;

    // Validate restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res
        .status(404)
        .json({ message: "Restaurant not found or inactive" });
    }

    // Validate and calculate order totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem || !menuItem.isAvailable) {
        return res
          .status(400)
          .json({
            message: `Menu item ${item.menuItem} not found or unavailable`,
          });
      }

      if (menuItem.restaurant.toString() !== restaurantId) {
        return res
          .status(400)
          .json({ message: "All items must be from the same restaurant" });
      }

      const itemTotal = menuItem.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        menuItem: menuItem._id,
        quantity: item.quantity,
        price: menuItem.price,
        specialInstructions: item.specialInstructions,
      });
    }

    // Check minimum order requirement
    if (subtotal < restaurant.minimumOrder) {
      return res.status(400).json({
        message: `Minimum order amount is $${restaurant.minimumOrder}`,
      });
    }

    // Calculate totals
    const deliveryFee = restaurant.deliveryFee;
    const tax = subtotal * 0.08; // 8% tax

    // Coupon discount
    let discount = 0
    let appliedCode = null
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase() })
      if (coupon) {
        const { valid, discount: d } = Coupon.computeDiscount({ coupon, subtotal, restaurantId })
        if (valid && d > 0) {
          discount = Math.min(d, subtotal)
          appliedCode = coupon.code
        }
      }
    }

    const total = Math.max(0, subtotal - discount) + deliveryFee + tax;

    // Calculate estimated delivery time or use scheduled time
    let estimatedDeliveryTime = new Date();
    if (orderType === "scheduled") {
      const when = new Date(scheduledFor)
      if (Number.isNaN(when.getTime())) {
        return res.status(400).json({ message: "Invalid scheduled date/time" })
      }
      const now = new Date()
      if (when.getTime() < now.getTime() + 15 * 60 * 1000) {
        return res
          .status(400)
          .json({ message: "Scheduled time must be at least 15 minutes from now" })
      }
      estimatedDeliveryTime = when
    } else {
      estimatedDeliveryTime.setMinutes(
        estimatedDeliveryTime.getMinutes() +
          restaurant.deliveryTime.min +
          Math.random() * (restaurant.deliveryTime.max - restaurant.deliveryTime.min),
      )
    }

    // Generate order number
    const orderNumber = await generateOrderNumber();

    const order = new Order({
      orderNumber,
      customer: req.user._id,
      restaurant: restaurantId,
      items: orderItems,
      fulfillmentMethod,
      subtotal,
      deliveryFee,
      tax,
  discount,
  couponCode: appliedCode,
      total,
      deliveryAddress,
      paymentMethod,
      paymentStatus: paymentStatus || "paid",
      paymentDetails: paymentDetails || undefined,
      orderType,
      scheduledFor: orderType === "scheduled" ? new Date(scheduledFor) : null,
      estimatedDeliveryTime,
    });

    await order.save();

    // Increment usage if coupon applied
    if (appliedCode) {
      try {
        await Coupon.updateOne({ code: appliedCode }, { $inc: { usedCount: 1 } })
      } catch {}
    }

    await order.populate([
      { path: "customer", select: "name email phone" },
      { path: "restaurant", select: "name address phone" },
      { path: "items.menuItem", select: "name price image" },
    ]);

    res.status(201).json({
      message: "Order created successfully",
      order,
    });

    // Emit an order created event to the customer so UI can show a tray card
    try {
      const room = String(order.customer._id || order.customer)
      const itemNames = (order.items || []).map((it) => it.menuItem?.name || it.name).filter(Boolean)
      global.io?.to(room).emit("order:created", {
        orderId: String(order._id),
        restaurant: { _id: String(order.restaurant._id || order.restaurant), name: order.restaurant.name },
        items: itemNames,
        status: order.status,
        createdAt: order.createdAt,
      })
    } catch {}
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Server error creating order" });
  }
};

// The rest of your functions remain the same...
export const getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, upcoming } = req.query;

    const query = { customer: req.user._id };

    if (status) {
      query.status = status;
    }

    if (type === "scheduled") {
      query.orderType = "scheduled"
      if (upcoming === "true") {
        query.scheduledFor = { $gte: new Date() }
      }
    } else if (type === "instant") {
      query.orderType = { $ne: "scheduled" }
    }

    let orders = await Order.find(query)
      .populate("restaurant", "name image address phone")
      .populate("items.menuItem", "name price image")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Attach the current user's review (if any) for each order
    const orderIds = orders.map((o) => o._id);
    if (orderIds.length) {
      const myReviews = await Review.find({
        user: req.user._id,
        order: { $in: orderIds },
        isActive: true,
      })
        .select("order rating comment createdAt")
        .lean();

      const byOrderId = new Map(myReviews.map((r) => [String(r.order), r]));
      orders = orders.map((o) => ({
        ...o,
        myReview: byOrderId.get(String(o._id)) || null,
      }));
    }

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Get user orders error:", error);
    res.status(500).json({ message: "Server error fetching orders" });
  }
};

export const getAdminOrders = async (req, res) => {
  try {
    console.log(
      "[v0] getAdminOrders called by user:",
      req.user.email,
      "role:",
      req.user.role
    );

    const { page = 1, limit = 20, status, restaurant } = req.query;

    const query = {};

    // If user is restaurant owner, only show their restaurant's orders
    if (req.user.role === "restaurant_owner") {
      const userRestaurants = await Restaurant.find({
        owner: req.user._id,
      }).select("_id");
      console.log("[v0] User restaurants found:", userRestaurants.length);
      console.log(
        "[v0] Restaurant IDs:",
        userRestaurants.map((r) => r._id)
      );

      query.restaurant = { $in: userRestaurants.map((r) => r._id) };
    }

    if (status) {
      query.status = status;
    }

    if (restaurant) {
      query.restaurant = restaurant;
    }

    console.log("[v0] Final query:", JSON.stringify(query));

    const orders = await Order.find(query)
      .populate("customer", "name email phone")
      .populate("restaurant", "name address phone")
      .populate("items.menuItem", "name price")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    console.log("[v0] Orders found:", orders.length, "Total count:", total);

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Get admin orders error:", error);
    res.status(500).json({ message: "Server error fetching orders" });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

  const order = await Order.findById(id).populate("restaurant");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check authorization
    if (req.user.role === "restaurant_owner") {
      if (order.restaurant.owner.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: "Not authorized to update this order" });
      }
    } else if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Not authorized to update order status" });
    }

    order.status = status;

    // Set actual delivery time if delivered
    if (status === "delivered") {
      order.actualDeliveryTime = new Date();
    }

  await order.save();

    res.json({
      message: "Order status updated successfully",
      order,
    });

    // Notify the customer about status change
    try {
      const room = String(order.customer)
      const payload = {
        orderId: String(order._id),
        status: order.status,
        restaurant: {
          _id: String(order.restaurant._id || order.restaurant),
          name: order.restaurant.name || undefined,
        },
        updatedAt: new Date().toISOString(),
      }
      // Emit live update
      global.io?.to(room).emit("order:status_updated", payload)
      // Persist a notification so it’s visible even if user wasn’t online
      await Notification.create({
        user: order.customer,
        type: "order_status",
        payload: {
          orderId: order._id,
          status: order.status,
          restaurant: payload.restaurant,
        },
      })
    } catch {}
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: "Server error updating order status" });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer", "name email phone")
      .populate("restaurant", "name address phone image owner")
      .populate("items.menuItem", "name price image description");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const canAccess =
      order.customer._id.toString() === req.user._id.toString() ||
      req.user.role === "admin" ||
      (req.user.role === "restaurant_owner" &&
        order.restaurant.owner.toString() === req.user._id.toString());

    if (!canAccess) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this order" });
    }

    res.json({ order });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ message: "Server error fetching order" });
  }
};