import { Router } from "express";
import {
  createMarks,
  getAllMarks,
  getMarksById,
  updateMarks,
  deleteMarks,
  getClassWiseMarksSummary,
  getFullMarksheet,
  updateStudentMarks,
} from "../controllers/MarksheetController.js";
import { teacherCreateMarks } from "../controllers/teacherMarksheetController.js";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = Router();

// 🔹 Protected/Admin Routes
router.get("/", getAllMarks);
router.get("/getClassWiseMarksSummary", getClassWiseMarksSummary);
router.get("/getFullMarksheet", getFullMarksheet);
router.put("/updateStudentMarks", updateStudentMarks);
router.get("/:id", getMarksById);
router.post("/", verifyJWT, createMarks);
router.put("/:id", verifyJWT, updateMarks);
router.delete("/:id", verifyJWT, deleteMarks);
router.post("/marksheet", verifyJWT, teacherCreateMarks);

export default router;
