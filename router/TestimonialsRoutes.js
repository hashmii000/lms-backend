import { Router } from "express";
import {
  createTestimonial,
  getAllTestimonials,
  getTestimonialById,
  updateTestimonial,
  deleteTestimonial,
} from "../controllers/TestimonialsControllers.js";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = Router();

// ✅ Public Routes
router.get("/", getAllTestimonials);
router.get("/:id", getTestimonialById);

// ✅ Protected/Admin Routes
router.post("/", verifyJWT, createTestimonial);
router.put("/:id", verifyJWT, updateTestimonial);
router.delete("/:id", verifyJWT, deleteTestimonial);

export default router;
