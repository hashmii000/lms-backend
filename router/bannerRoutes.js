import { Router } from "express";
import {
  createBanner,
  getAllBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
} from "../controllers/BannerController.js";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = Router();

// 🔹 Public Routes
router.get("/", getAllBanners);
router.get("/:id", getBannerById);

// 🔹 Protected/Admin Routes
router.post("/", verifyJWT, createBanner);
router.put("/:id", verifyJWT, updateBanner);
router.delete("/:id", verifyJWT, deleteBanner);

export default router;
