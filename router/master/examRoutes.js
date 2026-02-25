import express from "express";
import {
  createExam,
  getAllExams,
  getExamById,
  updateExam,
  deleteExam,
  migrateExamOrder,
} from "../../controllers/master/ExamController.js";
import { verifyJWT } from "../../middlewares/authTypeMiddleware.js";

const router = express.Router();

router.post("/", verifyJWT, createExam);
router.get("/", getAllExams);
router.get("/:id", getExamById);
router.put("/migrateExamOrder", migrateExamOrder);
router.put("/:id", verifyJWT, updateExam);
router.delete("/:id", verifyJWT, deleteExam);

export default router;
