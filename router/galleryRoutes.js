import { Router } from "express";
import {
  createGallery,
  getAllGallery,
  getGalleryById,
  updateGallery,
  deleteGallery,
} from "../controllers/GalleryController.js";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = Router();

// ✅ Public Routes
router.get("/", getAllGallery);
router.get("/:id", getGalleryById);

// ✅ Protected/Admin Routes
router.post("/", verifyJWT, createGallery);
router.put("/:id", verifyJWT, updateGallery);
router.delete("/:id", verifyJWT, deleteGallery);

export default router;
