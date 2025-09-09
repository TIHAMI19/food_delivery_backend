import Banner from "../models/Banner.js"
import fs from "fs"
import path from "path"

// POST /api/marketing/banner
export const uploadBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" })
    }

    const imageUrl = `/uploads/${req.file.filename}`

    // Deactivate existing active banners
    await Banner.updateMany({ active: true }, { $set: { active: false } })

    // Create new banner as active
    const banner = await Banner.create({ imageUrl, active: true })
    return res.status(201).json({ banner })
  } catch (error) {
    console.error("uploadBanner error", error)
    return res.status(500).json({ message: "Failed to upload banner" })
  }
}

// GET /api/marketing/banner (public)
export const getActiveBanner = async (req, res) => {
  try {
    const banner = await Banner.findOne({ active: true }).sort({ createdAt: -1 })
    return res.json({ banner })
  } catch (error) {
    console.error("getActiveBanner error", error)
    return res.status(500).json({ message: "Failed to fetch banner" })
  }
}

// GET /api/marketing/banners (admin)
export const listBanners = async (req, res) => {
  try {
    const banners = await Banner.find({}).sort({ createdAt: -1 })
    return res.json({ banners })
  } catch (error) {
    console.error("listBanners error", error)
    return res.status(500).json({ message: "Failed to fetch banners" })
  }
}

// PATCH /api/marketing/banner/:id/activate (admin)
export const activateBanner = async (req, res) => {
  try {
    const { id } = req.params
    const banner = await Banner.findById(id)
    if (!banner) return res.status(404).json({ message: "Banner not found" })

    await Banner.updateMany({ _id: { $ne: id }, active: true }, { $set: { active: false } })
    banner.active = true
    await banner.save()
    return res.json({ banner })
  } catch (error) {
    console.error("activateBanner error", error)
    return res.status(500).json({ message: "Failed to activate banner" })
  }
}

// DELETE /api/marketing/banner/:id (admin)
export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params
    const banner = await Banner.findById(id)
    if (!banner) return res.status(404).json({ message: "Banner not found" })

    // Attempt to delete file from disk
    try {
      if (banner.imageUrl) {
        const rel = banner.imageUrl.replace(/^\//, "") // strip leading slash
        const filePath = path.join(process.cwd(), rel)
        fs.existsSync(filePath) && fs.unlinkSync(filePath)
      }
    } catch (e) {
      // Ignore file deletion errors
      console.warn("Failed to remove banner file", e?.message)
    }

    await Banner.deleteOne({ _id: id })
    return res.json({ success: true })
  } catch (error) {
    console.error("deleteBanner error", error)
    return res.status(500).json({ message: "Failed to delete banner" })
  }
}
