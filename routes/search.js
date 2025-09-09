import express from "express"
import { search, getPopularSearches } from "../controllers/searchController.js"

const router = express.Router()

// Routes
router.get("/", search)
router.get("/popular", getPopularSearches)

export default router
