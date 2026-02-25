import { Router } from "express";
import {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} from "../../controllers/master/subjectController.js";

import { verifyJWT } from "../../middlewares/authTypeMiddleware.js";

const router = Router();

// 🔹 Public Routes
router.get("/", getAllSubjects);
router.get("/:id", getSubjectById);

// 🔹 Protected/Admin Routes
router.post("/", verifyJWT, createSubject);
router.put("/:id", verifyJWT, updateSubject);
router.delete("/:id", verifyJWT, deleteSubject);

export default router;
