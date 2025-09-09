import express from "express"
import { authenticate, authorize } from "../middleware/auth.js"
import { upload } from "../middleware/upload.js"
import { uploadBanner, getActiveBanner, listBanners, activateBanner, deleteBanner } from "../controllers/marketingController.js"

const router = express.Router()

// Public: get current active banner
router.get("/banner", getActiveBanner)

// Admin: upload new banner image
router.post(
  "/banner",
  authenticate,
  authorize("admin"),
  upload.single("image"),
  uploadBanner,
)

// Admin: list, activate and delete banners
router.get("/banners", authenticate, authorize("admin"), listBanners)
router.patch("/banner/:id/activate", authenticate, authorize("admin"), activateBanner)
router.delete("/banner/:id", authenticate, authorize("admin"), deleteBanner)

export default router
