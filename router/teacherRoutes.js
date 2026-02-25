import { Router } from "express";
import {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  assignClassToTeacher,
  getAssignedClassesByTeacherSession,
  updateAssignedClass,
  deleteAssignedClass,
} from "../controllers/TeacherController.js";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = Router();

/* ================= PUBLIC ================= */
router.get("/", getAllTeachers);
router.get("/:id", getTeacherById);

/* ================= PROTECTED ================= */
router.post("/", verifyJWT, createTeacher);
router.put("/:id", verifyJWT, updateTeacher);
router.delete("/:id", verifyJWT, deleteTeacher);


/* ======================================================
   📚 TEACHER CLASS ASSIGNMENT ROUTES
====================================================== */

router.post("/:teacherId/assign-class", assignClassToTeacher);

router.get("/:teacherId/assigned-classes", getAssignedClassesByTeacherSession);

router.put("/assigned-class/:assignId", updateAssignedClass);

router.delete("/assigned-class/:assignId", deleteAssignedClass);


export default router;
