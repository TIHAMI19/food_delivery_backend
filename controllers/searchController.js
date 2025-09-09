import Restaurant from "../models/Restaurant.js"
import MenuItem from "../models/MenuItem.js"

export const search = async (req, res) => {
  try {
    const { q, type = "all", location, maxPrice, cuisine, dietary, rating, page = 1, limit = 20 } = req.query

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters long" })
    }

    const results = {
      restaurants: [],
      menuItems: [],
      total: 0,
    }

    // Search restaurants
    if (type === "all" || type === "restaurants") {
      const restaurantQuery = {
        $text: { $search: q },
        isActive: true,
      }

      // Apply filters
      if (cuisine) {
        restaurantQuery.cuisine = { $in: cuisine.split(",") }
      }

      if (rating) {
        restaurantQuery.rating = { $gte: Number.parseFloat(rating) }
      }

      // Location-based search
      if (location) {
        const [lng, lat] = location.split(",").map(Number)
        if (!isNaN(lat) && !isNaN(lng)) {
          restaurantQuery["address.location"] = {
            $near: {
              $geometry: { type: "Point", coordinates: [lng, lat] },
              $maxDistance: 15000, // 15km radius
            },
          }
        }
      }

      const restaurants = await Restaurant.find(restaurantQuery)
        .select("name description cuisine address rating totalReviews priceRange deliveryTime image")
        .sort({ score: { $meta: "textScore" }, rating: -1 })
        .limit(type === "restaurants" ? limit * 1 : 10)

      results.restaurants = restaurants
    }

    // Search menu items
    if (type === "all" || type === "menu") {
      const menuQuery = {
        $text: { $search: q },
        isAvailable: true,
      }

      // Apply filters
      if (maxPrice) {
        menuQuery.price = { $lte: Number.parseFloat(maxPrice) }
      }

      if (dietary) {
        menuQuery.dietary = { $in: dietary.split(",") }
      }

      let menuItems = await MenuItem.find(menuQuery)
        .populate("restaurant", "name address rating deliveryTime isActive")
        .select("name description price image category rating restaurant")
        .sort({ score: { $meta: "textScore" }, rating: -1 })
        .limit(type === "menu" ? limit * 1 : 10)

      // Filter out items from inactive restaurants
      menuItems = menuItems.filter((item) => item.restaurant && item.restaurant.isActive)

      // Apply location filter to menu items through their restaurants
      if (location) {
        const [lng, lat] = location.split(",").map(Number)
        if (!isNaN(lat) && !isNaN(lng)) {
          const nearbyRestaurants = await Restaurant.find({
            "address.location": {
              $near: {
                $geometry: { type: "Point", coordinates: [lng, lat] },
                $maxDistance: 15000,
              },
            },
            isActive: true,
          }).select("_id")

          const nearbyRestaurantIds = nearbyRestaurants.map((r) => r._id.toString())
          menuItems = menuItems.filter((item) => nearbyRestaurantIds.includes(item.restaurant._id.toString()))
        }
      }

      results.menuItems = menuItems
    }

    results.total = results.restaurants.length + results.menuItems.length

    // Pagination for combined results
    if (type === "all") {
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + Number.parseInt(limit)

      const combinedResults = [...results.restaurants, ...results.menuItems]
      const paginatedResults = combinedResults.slice(startIndex, endIndex)

      // Separate paginated results back
      results.restaurants = paginatedResults.filter((item) => item.cuisine !== undefined)
      results.menuItems = paginatedResults.filter((item) => item.category !== undefined)
    }

    res.json({
      query: q,
      results,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: results.total,
        totalPages: Math.ceil(results.total / limit),
      },
    })
  } catch (error) {
    console.error("Search error:", error)
    res.status(500).json({ message: "Server error during search" })
  }
}

export const getPopularSearches = async (req, res) => {
  try {
    // Get popular cuisines
    const popularCuisines = await Restaurant.aggregate([
      { $match: { isActive: true } },
      { $unwind: "$cuisine" },
      { $group: { _id: "$cuisine", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ])

    // Get popular menu categories
    const popularCategories = await MenuItem.aggregate([
      { $match: { isAvailable: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ])

    // Get trending restaurants (high rating, recent)
    const trendingRestaurants = await Restaurant.find({
      isActive: true,
      rating: { $gte: 4.0 },
      totalReviews: { $gte: 10 },
    })
      .select("name cuisine rating image")
      .sort({ rating: -1, totalReviews: -1 })
      .limit(6)

    res.json({
      popularCuisines: popularCuisines.map((c) => c._id),
      popularCategories: popularCategories.map((c) => c._id),
      trendingRestaurants,
    })
  } catch (error) {
    console.error("Get popular searches error:", error)
    res.status(500).json({ message: "Server error fetching popular searches" })
  }
}
