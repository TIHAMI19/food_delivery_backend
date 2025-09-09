import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["customer", "admin", "restaurant_owner", "rider"],
      default: "customer",
    },
    phone: {
      type: String,
      match: [/^\+?[\d\s-()]+$/, "Please enter a valid phone number"],
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    riderInfo: {
      vehicleType: {
        type: String,
        enum: ["bike", "motorcycle", "car", "bicycle"],
        required: function () {
          return this.role === "rider"
        },
      },
      vehicleNumber: {
        type: String,
        required: function () {
          return this.role === "rider"
        },
      },
      licenseNumber: {
        type: String,
        required: function () {
          return this.role === "rider"
        },
      },
      isAvailable: {
        type: Boolean,
        default: true,
      },
      currentLocation: {
        lat: Number,
        lng: Number,
      },
      rating: {
        type: Number,
        default: 5.0,
        min: 1,
        max: 5,
      },
      totalDeliveries: {
        type: Number,
        default: 0,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject()
  delete userObject.password
  return userObject
}

export default mongoose.model("User", userSchema)
