import { Router } from "express";
import {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
  migrateClassOrder,
} from "../../controllers/master/classController.js"

import { verifyJWT } from "../../middlewares/authTypeMiddleware.js";

const router = Router();

// 🔹 Public Routes
router.get("/", getAllClasses);
router.get("/:id", getClassById);
router.put("/migrateClassOrder", migrateClassOrder);

// 🔹 Protected/Admin Routes
router.post("/", verifyJWT, createClass);
router.put("/:id", verifyJWT, updateClass);
router.delete("/:id", verifyJWT, deleteClass);

export default router;
