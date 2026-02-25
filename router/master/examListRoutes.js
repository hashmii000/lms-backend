import express from "express";
import {
  createExamList,
  getAllExamList,
  getExamByIdList,
  updateExamList,
  deleteExamList,
} from "../../controllers/master/ExamListController.js";
import { verifyJWT } from "../../middlewares/authTypeMiddleware.js";

const router = express.Router();

router.post("/",verifyJWT, createExamList);
router.get("/", getAllExamList);
router.get("/:id", getExamByIdList);
router.put("/:id", verifyJWT, updateExamList);
router.delete("/:id", verifyJWT, deleteExamList);

export default router;
