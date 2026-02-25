import Attendance from "../models/student/Attandance.modal.js";
import StudentEnrollment from "../models/student/StudentEnrolment.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

/**
 * 🟢 CREATE ATTENDANCE
 */
const createAttendance = asyncHandler(async (req, res) => {
    const { sessionId, classId, sectionId, date, attendance } = req.body;

    if (!sessionId || !classId || !sectionId || !date) {
        return res
            .status(400)
            .json(new apiResponse(400, null, "Session, Class, Section and Date are required"));
    }

    if (!Array.isArray(attendance) || attendance.length === 0) {
        return res
            .status(400)
            .json(new apiResponse(400, null, "Attendance list is required"));
    }

    // 🔒 duplicate check
    const alreadyExists = await Attendance.findOne({
        sessionId,
        classId,
        sectionId,
        date: new Date(date),
    });

    if (alreadyExists) {
        return res
            .status(400)
            .json(new apiResponse(400, null, "Attendance already marked for this date"));
    }

    // 🔑 Student ObjectIds
    const studentIds = attendance.map(a => a.studentId);

    // ✅ CORRECT validation (field names fixed)
    const validStudents = await StudentEnrollment.find({
        session: sessionId,
        currentClass: classId,
        currentSection: sectionId,
        status: "Studying",
        _id: { $in: studentIds },
    }).select("_id");

    if (validStudents.length !== studentIds.length) {
        return res
            .status(400)
            .json(new apiResponse(400, null, "Some students do not belong to this class/section/session"));
    }

    const savedAttendance = await Attendance.create({
        sessionId,
        classId,
        sectionId,
        date: new Date(date),
        attendance: attendance.map(a => ({
            studentId: a.studentId, // StudentEnrolment _id
            status: a.status || "A",
        })),
        markedBy: req.user?._id,
    });

    res
        .status(201)
        .json(new apiResponse(201, savedAttendance, "Attendance marked successfully"));
});

const getClassMonthlyCalendarAttendance = asyncHandler(async (req, res) => {
    const { sessionId, classId, sectionId, month, year } = req.query;

    if (!sessionId || !classId || !sectionId || !month || !year) {
        return res
            .status(400)
            .json(new apiResponse(400, null, "All query parameters are required"));
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const totalDays = new Date(year, month, 0).getDate();

    /* 🧑‍🎓 STEP 1: Get all students of class/section */
    const students = await StudentEnrollment.find({
        session: sessionId,
        currentClass: classId,
        currentSection: sectionId,
        status: "Studying",
    }).select("_id firstName lastName rollNumber");

    /* 🧾 STEP 2: Get attendance records of month */
    const attendanceData = await Attendance.aggregate([
        {
            $match: {
                sessionId: new mongoose.Types.ObjectId(sessionId),
                classId: new mongoose.Types.ObjectId(classId),
                sectionId: new mongoose.Types.ObjectId(sectionId),
                date: { $gte: startDate, $lte: endDate },
            },
        },
        { $unwind: "$attendance" },
        {
            $project: {
                studentId: "$attendance.studentId",
                status: "$attendance.status",
                day: { $dayOfMonth: "$date" },
            },
        },
    ]);

    /* 🧩 STEP 3: Build response */
    const studentMap = {};

    students.forEach((s) => {
        studentMap[s._id.toString()] = {
            studentId: s._id,
            name: `${s.firstName || ""} ${s.lastName || ""}`.trim(),
            rollNumber: s.rollNumber || "",
            attendance: Array.from({ length: totalDays }, (_, i) => ({
                day: i + 1,
                status: "",
            })),
        };
    });

    attendanceData.forEach((a) => {
        const sid = a.studentId.toString();
        if (studentMap[sid]) {
            studentMap[sid].attendance[a.day - 1].status = a.status;
        }
    });

    res.status(200).json(
        new apiResponse(
            200,
            {
                month: Number(month),
                year: Number(year),
                totalDays,
                students: Object.values(studentMap),
            },
            "Class monthly attendance fetched successfully"
        )
    );
});

const getStudentMonthlyCalendarAttendance = asyncHandler(async (req, res) => {
    const { studentId, sessionId, classId, sectionId, month, year } = req.query;

    if (!studentId || !sessionId || !classId || !sectionId || !month || !year) {
        return res
            .status(400)
            .json(new apiResponse(400, null, "All query parameters are required"));
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const totalDays = new Date(year, month, 0).getDate();

    // 🟡 current date info
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const isCurrentMonth =
        Number(month) === currentMonth && Number(year) === currentYear;

    // 🧱 Step 1: blank calendar
    const calendar = Array.from({ length: totalDays }, (_, i) => {
        const day = i + 1;
        const dateObj = new Date(year, month - 1, day);

        return {
            day,
            status: "",
            isToday: isCurrentMonth && day === currentDay,
            isSunday: dateObj.getDay() === 0, // optional
            isFuture:
                isCurrentMonth && day > currentDay
        };
    });

    // 🧾 Step 2: fetch attendance
    const records = await Attendance.aggregate([
        {
            $match: {
                sessionId: new mongoose.Types.ObjectId(sessionId),
                classId: new mongoose.Types.ObjectId(classId),
                sectionId: new mongoose.Types.ObjectId(sectionId),
                date: { $gte: startDate, $lte: endDate },
            },
        },
        { $unwind: "$attendance" },
        {
            $match: {
                "attendance.studentId": new mongoose.Types.ObjectId(studentId),
            },
        },
        {
            $project: {
                day: { $dayOfMonth: "$date" },
                status: "$attendance.status",
            },
        },
    ]);

    // 🧩 Step 3: fill calendar
    records.forEach((r) => {
        calendar[r.day - 1].status = r.status;
    });

    res.status(200).json(
        new apiResponse(
            200,
            {
                studentId,
                month: Number(month),
                year: Number(year),
                isCurrentMonth,
                today: isCurrentMonth ? currentDay : null,
                attendance: calendar,
            },
            "Student monthly attendance fetched"
        )
    );
});



/**
 * 🟡 GET DAY-WISE ATTENDANCE (Class)
 */
const getAttendanceByDate = asyncHandler(async (req, res) => {
    const { sessionId, classId, sectionId, date } = req.query;

    if (!sessionId || !classId || !sectionId || !date) {
        return res
            .status(400)
            .json(new apiResponse(400, null, "Required query parameters missing"));
    }

    const attendance = await Attendance.findOne({
        sessionId,
        classId,
        sectionId,
        date: new Date(date),
    }).populate("attendance.studentId", "studentRegistrationId phone studentId firstName middleName lastName dob fatherName gender rollNumber").populate("sessionId").populate("classId").populate("sectionId");

    if (!attendance) {
        return res
            .status(404)
            .json(new apiResponse(404, null, "Attendance not found"));
    }

    res
        .status(200)
        .json(new apiResponse(200, attendance, "Attendance fetched successfully"));
});

/**
 * 🟠 UPDATE ATTENDANCE
 */
const updateAttendance = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res
            .status(400)
            .json(new apiResponse(400, null, "Invalid attendance ID"));
    }

    const updated = await Attendance.findByIdAndUpdate(
        req.params.id,
        { attendance: req.body.attendance },
        { new: true }
    );

    if (!updated) {
        return res
            .status(404)
            .json(new apiResponse(404, null, "Attendance not found"));
    }

    res
        .status(200)
        .json(new apiResponse(200, updated, "Attendance updated successfully"));
});


const getMonthWiseClassReport = asyncHandler(async (req, res) => {
    const { sessionId, classId, sectionId, month, year } = req.query;

    if (!sessionId || !classId || !sectionId || !month || !year) {
        return res
            .status(400)
            .json(new apiResponse(400, null, "Missing query parameters"));
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const report = await Attendance.aggregate([
        {
            $match: {
                sessionId: new mongoose.Types.ObjectId(sessionId),
                classId: new mongoose.Types.ObjectId(classId),
                sectionId: new mongoose.Types.ObjectId(sectionId),
                date: { $gte: startDate, $lte: endDate },
            },
        },
        { $unwind: "$attendance" },
        {
            $group: {
                _id: "$attendance.studentId",
                present: {
                    $sum: { $cond: [{ $eq: ["$attendance.status", "P"] }, 1, 0] },
                },
                absent: {
                    $sum: { $cond: [{ $eq: ["$attendance.status", "A"] }, 1, 0] },
                },
            },
        },
    ]);

    res
        .status(200)
        .json(new apiResponse(200, report, "Month-wise class report fetched"));
});

const getYearWiseClassReport = asyncHandler(async (req, res) => {
    const { sessionId, classId, sectionId, year } = req.query;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const report = await Attendance.aggregate([
        {
            $match: {
                sessionId: new mongoose.Types.ObjectId(sessionId),
                classId: new mongoose.Types.ObjectId(classId),
                sectionId: new mongoose.Types.ObjectId(sectionId),
                date: { $gte: startDate, $lte: endDate },
            },
        },
        { $unwind: "$attendance" },
        {
            $group: {
                _id: "$attendance.studentId",
                totalPresent: {
                    $sum: { $cond: [{ $eq: ["$attendance.status", "P"] }, 1, 0] },
                },
                totalAbsent: {
                    $sum: { $cond: [{ $eq: ["$attendance.status", "A"] }, 1, 0] },
                },
            },
        },
    ]);

    res
        .status(200)
        .json(new apiResponse(200, report, "Year-wise class report fetched"));
});

const getStudentAttendanceReport = asyncHandler(async (req, res) => {
    const { studentId, month, year } = req.query;

    if (!studentId || !year) {
        return res
            .status(400)
            .json(new apiResponse(400, null, "StudentId and year required"));
    }

    const startDate = month
        ? new Date(year, month - 1, 1)
        : new Date(year, 0, 1);

    const endDate = month
        ? new Date(year, month, 0, 23, 59, 59)
        : new Date(year, 11, 31, 23, 59, 59);

    const report = await Attendance.aggregate([
        { $unwind: "$attendance" },
        {
            $match: {
                "attendance.studentId": new mongoose.Types.ObjectId(studentId),
                date: { $gte: startDate, $lte: endDate },
            },
        },
        {
            $group: {
                _id: "$attendance.studentId",
                present: {
                    $sum: { $cond: [{ $eq: ["$attendance.status", "P"] }, 1, 0] },
                },
                absent: {
                    $sum: { $cond: [{ $eq: ["$attendance.status", "A"] }, 1, 0] },
                },
            },
        },
    ]);

    res
        .status(200)
        .json(new apiResponse(200, report[0] || {}, "Student attendance report"));
});

export {
    createAttendance,
    getAttendanceByDate,
    updateAttendance,
    getMonthWiseClassReport,
    getYearWiseClassReport,
    getStudentAttendanceReport,
    getClassMonthlyCalendarAttendance,
    getStudentMonthlyCalendarAttendance
};
