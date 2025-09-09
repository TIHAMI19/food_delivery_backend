import mongoose from "mongoose"

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Restaurant name is required"],
      trim: true,
      maxlength: [100, "Restaurant name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cuisine: {
      type: [String],
      required: [true, "At least one cuisine type is required"],
      enum: [
        "Italian",
        "Chinese",
        "Indian",
        "Mexican",
        "American",
        "Thai",
        "Japanese",
        "Mediterranean",
        "French",
        "Korean",
        "Vietnamese",
        "Greek",
        "Other",
      ],
    },
    address: {
      street: {
        type: String,
        required: [true, "Street address is required"],
      },
      city: {
        type: String,
        required: [true, "City is required"],
      },
      state: {
        type: String,
        required: [true, "State is required"],
      },
      zipCode: {
        type: String,
        required: [true, "Zip code is required"],
      },
      coordinates: {
        lat: {
          type: Number,
          required: true,
        },
        lng: {
          type: Number,
          required: true,
        },
      },
      // GeoJSON location for geospatial queries (lng, lat)
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          // [lng, lat]
          required: true,
          validate: {
            validator: function (val) {
              return Array.isArray(val) && val.length === 2
            },
            message: "Location coordinates must be an array of [lng, lat]",
          },
        },
      },
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^\+?[\d\s-()]+$/, "Please enter a valid phone number"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
    },
    image: {
      type: String,
      default: "/placeholder.svg?height=300&width=400",
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
    priceRange: {
      type: String,
      enum: ["$", "$$", "$$$", "$$$$"],
      required: true,
    },
    deliveryTime: {
      min: {
        type: Number,
        required: true,
        min: 10,
      },
      max: {
        type: Number,
        required: true,
        max: 120,
      },
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
    },
    minimumOrder: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    operatingHours: {
      monday: { open: String, close: String, closed: { type: Boolean, default: false } },
      tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
      friday: { open: String, close: String, closed: { type: Boolean, default: false } },
      saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
      sunday: { open: String, close: String, closed: { type: Boolean, default: false } },
    },
  },
  {
    timestamps: true,
  },
)

// Indexes
restaurantSchema.index({ "address.location": "2dsphere" })
restaurantSchema.index({ cuisine: 1 })
restaurantSchema.index({ rating: -1 })
// Single text index combining relevant fields
restaurantSchema.index({ name: "text", description: "text", cuisine: "text" })

// Ensure GeoJSON location is populated before validation
restaurantSchema.pre("validate", function (next) {
  try {
    if (
      this.address &&
      this.address.coordinates &&
      typeof this.address.coordinates.lng === "number" &&
      typeof this.address.coordinates.lat === "number"
    ) {
      if (!this.address.location) this.address.location = {}
      this.address.location.type = this.address.location.type || "Point"
      this.address.location.coordinates = [
        this.address.coordinates.lng,
        this.address.coordinates.lat,
      ]
    }
  } catch {}
  next()
})

export default mongoose.model("Restaurant", restaurantSchema)
