import { Router } from "express";
import {
  createStudentEnrolment,
  getAllStudentEnrolments,
  getStudentEnrolmentById,
  updateStudentEnrolment,
  deleteStudentEnrolment,
  bulkStudentTransfer,
  assignRollNumbersByName,
  assignBulkManualRollNumbers,
} from "../controllers/StudentEnrolmentController.js";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = Router();

/* ================= PUBLIC ================= */
router.get("/", getAllStudentEnrolments);
router.get("/:id", getStudentEnrolmentById);

/* ================= PROTECTED ================= */
router.post("/", verifyJWT, createStudentEnrolment);
router.post("/assignRollNumbersByName", assignRollNumbersByName);
router.post("/assignBulkManualRollNumbers", assignBulkManualRollNumbers);
router.put("/:id", verifyJWT, updateStudentEnrolment);
router.delete("/:id", verifyJWT, deleteStudentEnrolment);

// router.post("/transfer", verifyJWT, bulkStudentTransfer);

export default router;
