import { Router } from "express";
import {
    createAttendance,
    getAttendanceByDate,
    updateAttendance,
    getMonthWiseClassReport,
    getYearWiseClassReport,
    getStudentAttendanceReport,
    getClassMonthlyCalendarAttendance,
    getStudentMonthlyCalendarAttendance,
} from "../controllers/AttendanceController.js";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = Router();

/**
 * 🟢 ATTENDANCE (Mark / View / Update)
 */

// Get day-wise attendance (class + section)
router.get("/day", verifyJWT, getAttendanceByDate);

// Mark attendance
router.post("/", verifyJWT, createAttendance);

// Update attendance
router.put("/:id", verifyJWT, updateAttendance);

/**
 * 📊 REPORTS
 */

// Class-wise month report
router.get("/report/class/month", verifyJWT, getMonthWiseClassReport);

// Class-wise year report
router.get("/report/class/year", verifyJWT, getYearWiseClassReport);

// Student-wise report (month / year)
router.get("/report/student", verifyJWT, getStudentAttendanceReport);

router.get("/monthly-calendar", getClassMonthlyCalendarAttendance);
router.get("/monthly-student-calendar", getStudentMonthlyCalendarAttendance);

export default router;
