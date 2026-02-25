import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/CategoryController.js";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = Router();

// ✅ Public Routes
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

// ✅ Protected/Admin Routes
router.post("/", verifyJWT, createCategory);
router.put("/:id", verifyJWT,  updateCategory);
router.delete("/:id", verifyJWT, deleteCategory);

export default router;
