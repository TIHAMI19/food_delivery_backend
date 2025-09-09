import mongoose from "mongoose"

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Menu item name is required"],
      trim: true,
      maxlength: [100, "Menu item name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [300, "Description cannot exceed 300 characters"],
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
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
      ],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    image: {
      type: String,
      default: "",
    },
    ingredients: [
      {
        type: String,
        trim: true,
      },
    ],
    allergens: [
      {
        type: String,
        enum: ["Nuts", "Dairy", "Gluten", "Soy", "Eggs", "Shellfish", "Fish", "Sesame"],
      },
    ],
    dietary: [
      {
        type: String,
        enum: ["Vegetarian", "Vegan", "Gluten-Free", "Keto", "Low-Carb", "Halal", "Kosher"],
      },
    ],
    spiceLevel: {
      type: String,
      enum: ["Mild", "Medium", "Hot", "Extra Hot"],
      default: "Mild",
    },
    preparationTime: {
      type: Number,
      required: true,
      min: 5,
      max: 60,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    nutritionalInfo: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
      fiber: Number,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for efficient queries
menuItemSchema.index({ restaurant: 1, category: 1 })
menuItemSchema.index({ name: "text", description: "text" })
menuItemSchema.index({ price: 1 })
menuItemSchema.index({ rating: -1 })

export default mongoose.model("MenuItem", menuItemSchema)
