import mongoose from "mongoose";
import Teacher from "../models/teacher/Teacher.modal.js";
import StudentEnrolment from "../models/student/StudentEnrolment.modal.js";
import Marksheet from "../models/report/Marksheet.model.js";
import Session from "../models/master/Session.model.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

/* ================= TEACHER CREATE MARKSHEET ================= */
const teacherCreateMarks = asyncHandler(async (req, res) => {
  const { examListId, studentId, subjects } = req.body;
  const loggedInUser = req.user; // from verifyJWT

  /* ===== ROLE CHECK (User model) ===== */
  if (loggedInUser.role !== "Teacher") {
    return res
      .status(403)
      .json(new apiResponse(403, null, "Only teachers can add marks"));
  }

  /* ===== CURRENT SESSION ===== */
  const currentSession = await Session.findOne({ isCurrent: true });
  if (!currentSession) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Current session not found"));
  }

  /* ===== FETCH TEACHER (Teacher model) ===== */
  const teacher = await Teacher.findOne({ userId: loggedInUser._id });

  if (!teacher) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Teacher profile not found"));
  }

  /* ===== FIND CLASS TEACHER ASSIGNMENT ===== */
  const classTeacherAssignment = teacher.classesAssigned.find(
    (c) =>
      c.session?.toString() === currentSession._id.toString() &&
      c.isClassTeacher === true
  );

  if (!classTeacherAssignment) {
    return res.status(403).json(
      new apiResponse(
        403,
        null,
        "You are not assigned as class teacher for current session",
      ),
    );
  }

  const { classId, sectionId } = classTeacherAssignment;

  /* ===== VALIDATION ===== */
  if (!mongoose.Types.ObjectId.isValid(examListId)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid examListId"));
  }

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid studentId"));
  }

  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Subjects are required"));
  }

  /* ===== STUDENT CHECK (CLASS + SECTION) ===== */
  const student = await StudentEnrolment.findById(studentId);

  if (!student) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Student not found"));
  }

  if (
    student.classId.toString() !== classId.toString() ||
    student.currentSection.toString() !== sectionId.toString()
  ) {
    return res.status(403).json(
      new apiResponse(
        403,
        null,
        "You can add marks only for your class & section students",
      ),
    );
  }

  /* ===== DUPLICATE CHECK ===== */
  const exists = await Marksheet.findOne({
    examListId,
    studentId,
    sessionId: currentSession._id,
  });

  if (exists) {
    return res.status(409).json(
      new apiResponse(
        409,
        null,
        "Marksheet already exists for this student",
      ),
    );
  }

  /* ===== CALCULATION ===== */
  let totalObtained = 0;
  let totalMax = 0;

  subjects.forEach((s) => {
    totalObtained += s.marksObtained || 0;
    totalMax += s.maxMarks || 0;
  });

  const percentage =
    totalMax > 0
      ? Number(((totalObtained / totalMax) * 100).toFixed(2))
      : 0;

  const result = percentage >= 33 ? "PASS" : "FAIL";

  /* ===== CREATE MARKSHEET ===== */
  const marksheet = await Marksheet.create({
    examListId,
    studentId,
    classId,
    sessionId: currentSession._id,
    subjects,
    totalObtainedMarks: totalObtained,
    totalMarks: totalMax,
    percentage,
    result,
  });

  res.status(201).json(
    new apiResponse(
      201,
      marksheet,
      "Marksheet created successfully by class teacher",
    ),
  );
});

export { teacherCreateMarks };
