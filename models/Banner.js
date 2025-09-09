import mongoose from "mongoose"

const bannerSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

// We expect at most one active banner
bannerSchema.index({ active: 1 })

const Banner = mongoose.model("Banner", bannerSchema)
export default Banner
