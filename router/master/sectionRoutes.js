import { Router } from "express";
import {
  createSection,
  getAllSections,
  getSectionById,
  updateSection,
  deleteSection,
  updateSectionOrder,
} from "../../controllers/master/sectionController.js";

import { verifyJWT } from "../../middlewares/authTypeMiddleware.js";

const router = Router();

// 🔹 Public Routes
router.get("/", getAllSections);
router.get("/:id", getSectionById);
router.put("/updateSectionOrder", updateSectionOrder);

// 🔹 Protected/Admin Routes
router.post("/", verifyJWT, createSection);
router.put("/:id", verifyJWT, updateSection);
router.delete("/:id", verifyJWT, deleteSection);

export default router;
