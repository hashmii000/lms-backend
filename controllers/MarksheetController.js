import Marksheet from "../models/report/Marksheet.model.js";
import ExamList from "../models/master/ExamList.model.js";
import Subject from "../models/master/Subject.model.js";
import StudentEnrolment from "../models/student/StudentEnrolment.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";
import Session from "../models/master/Session.model.js";

/* ================= CREATE MARKSHEET ================= */
const createMarks = asyncHandler(async (req, res) => {
  const { examListId, studentId, classId, sectionId, streamId, subjects } =
    req.body;

  if (!examListId || !mongoose.Types.ObjectId.isValid(examListId)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Valid examListId is required"));
  }

  if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Valid studentId is required"));
  }

  if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Valid classId is required"));
  }
  if (!sectionId || !mongoose.Types.ObjectId.isValid(sectionId)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Valid sectionId is required"));
  }

  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Subjects are required"));
  }

  /* ===== CURRENT SESSION ===== */
  const currentSession = await Session.findOne({ isCurrent: true });
  if (!currentSession) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Current session not found"));
  }
  // /* ===== STUDENT + SECTION ===== */
  // const student =
  //   await StudentEnrolment.findById(studentId).populate("currentSection");
  // if (!student || !student.currentSection) {
  //   return res
  //     .status(400)
  //     .json(new apiResponse(400, null, "Student section not found"));
  // }

  /* ===== DUPLICATE CHECK ===== */
  const alreadyExists = await Marksheet.findOne({
    examListId,
    studentId,
    sessionId: currentSession._id,
  });
  if (alreadyExists) {
    return res
      .status(409)
      .json(
        new apiResponse(409, null, "Marksheet already exists for this student"),
      );
  }

  /* ===== CALCULATION ===== */
  let totalObtained = 0;
  let totalMax = 0;

  subjects.forEach((sub) => {
    totalObtained += sub.marksObtained || 0;
    totalMax += sub.maxMarks || 0;
  });

  const percentage =
    totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(2)) : 0;

  const result = percentage >= 33 ? "PASS" : "FAIL";

  const marksheet = await Marksheet.create({
    examListId,
    studentId,
    classId,
    sectionId,
    streamId: streamId || null,
    sessionId: currentSession._id, // ✅ ADD THIS
    subjects,
    totalObtainedMarks: totalObtained,
    totalMarks: totalMax,
    percentage,
    result,
  });

  const populated = await Marksheet.findById(marksheet._id)
    .populate("examListId")
    .populate("studentId")
    .populate("classId")
    .populate("sectionId")
    .populate("streamId")
    .populate("subjects.subjectId");

  const formatted = {
    ...populated.toObject(),

    subjects: populated.subjects.map((s) => {
      const subjectPercentage =
        s.maxMarks > 0 ? (s.marksObtained / s.maxMarks) * 100 : 0;

      return {
        subjectId: s.subjectId?._id || null,
        subjectName: s.subjectId?.name || "",
        marksObtained: s.marksObtained,
        maxMarks: s.maxMarks,
        subjectPercentage: Number(subjectPercentage.toFixed(2)),
        subjectResult: subjectPercentage >= 33 ? "PASS" : "FAIL",
      };
    }),
  };

  res
    .status(201)
    .json(new apiResponse(201, formatted, "Marksheet created successfully"));
});



const getClassWiseMarksSummary = asyncHandler(async (req, res) => {
  const { classId, sessionId, sectionId, streamId, examListId } = req.query;

  let { page = 1, limit = 10 } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  // Only classId + sessionId required
  if (!classId || !sessionId) {
    return res.status(400).json(
      new apiResponse(400, null, "classId and sessionId are required")
    );
  }

  // ==== STUDENT FILTER ====
  const filter = {
    currentClass: classId,
    session: sessionId,
  };

  if (sectionId) filter.currentSection = sectionId;
  if (streamId) filter.stream = streamId;

  // ==== TOTAL STUDENTS BEFORE PAGINATION ====
  const totalStudents = await StudentEnrolment.countDocuments(filter);

  if (!totalStudents) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "No students found"));
  }

  const totalPages = Math.ceil(totalStudents / limit);
  const skip = (page - 1) * limit;

  // ==== FETCH STUDENTS WITH PAGINATION ====
  const students = await StudentEnrolment.find(filter)
    .populate("currentClass")
    .populate("currentSection")
    .populate("stream")
    .skip(skip)
    .limit(limit);

  // final array
  const resultData = [];

  for (const student of students) {
    const marksheetFilter = {
      studentId: student._id,
      classId,
      sessionId,
    };

    if (sectionId) marksheetFilter.sectionId = sectionId;
    if (streamId) marksheetFilter.streamId = streamId;
    if (examListId) marksheetFilter.examListId = examListId;

    const marksheet = await Marksheet.findOne(marksheetFilter)
      .populate("subjects.subjectId");

    if (marksheet) {
      resultData.push({
        studentId: student._id,
        name: `${student.firstName} ${student.lastName}`,
        fatherName: student.fatherName,
        motherName: student.motherName,
        profilePic: student.profilePic,
        rollNumber: student.rollNumber,
        class: student.currentClass?.name,
        section: student.currentSection?.name,
        stream: student.stream || null,

        totalObtained: marksheet.totalObtainedMarks,
        totalMarks: marksheet.totalMarks,
        percentage: marksheet.percentage,
        result: marksheet.result,
      });

    } else {
      resultData.push({
        studentId: student._id,
        name: `${student.firstName} ${student.lastName}`,
        fatherName: student.fatherName,
        motherName: student.motherName,
        profilePic: student.profilePic,
        rollNumber: student.rollNumber,
        class: student.currentClass?.name,
        section: student.currentSection?.name,
        stream: student.stream || null,

        totalObtained: 0,
        totalMarks: 0,
        percentage: 0,
        result: "",
      });
    }
  }

  return res.status(200).json(
    new apiResponse(200, {
      page,
      limit,
      totalStudents,
      totalPages,
      students: resultData,
    }, "Student marks summary fetched")
  );
});



const getFullMarksheet = asyncHandler(async (req, res) => {
  const { studentId, sessionId } = req.query;

  if (!studentId) {
    return res.status(400).json(
      new apiResponse(400, null, "studentId is required")
    );
  }

  // 🔥 Get Current Session If Not Provided
  let finalSessionId = sessionId;
  if (!sessionId) {
    const currentSession = await Session.findOne({ isCurrent: true });
    if (!currentSession)
      return res.status(400).json(new apiResponse(400, null, "Session not found"));

    finalSessionId = currentSession._id;
  }

  // 🔥 FETCH STUDENT DETAILS
  const student = await StudentEnrolment.findById(studentId)
    .populate("currentClass")
    .populate("currentSection")
    .populate("stream")
    .populate("session");

  if (!student) {
    return res.status(404).json(new apiResponse(404, null, "Student not found"));
  }

  const classId = student.currentClass?._id;
  const streamId = student.stream?._id;

  // 🔥 FETCH ALL SUBJECTS OF CLASS + STREAM
  const subjects = await Subject.find({
    classes: classId,
    ...(streamId ? { streamId } : {})
  });

  // console.log("subjects", subjects);


  // 🔥 FETCH ALL EXAMS OF THIS CLASS & SESSION
  const exams = await ExamList.find({
    classId,
    sessionId: finalSessionId,
  }).populate("examMasterId");




  if (!exams.length) {
    return res.status(404).json(new apiResponse(404, null, "No exams found"));
  }

  // 🔥 Fetch all marksheets of this student (all exams)
  const marksheets = await Marksheet.find({
    studentId,
    sessionId: finalSessionId,
  }).populate("subjects.subjectId").populate("examListId");

  // Convert array → object for fast lookup
  const marksheetMap = {};
  marksheets.forEach((m) => {
    marksheetMap[m.examListId?._id] = m;
  });

  // 🔥 BUILD FINAL EXAM-WISE DATA
  const examWiseData = [];

  for (const exam of exams) {
    const ms = marksheetMap[exam._id]; // current exam marksheet

    const subjectWiseData = subjects.map((sub) => {
      // find subject marks inside marksheet
      const subMarks = ms?.subjects?.find(
        (s) => String(s.subjectId?._id) === String(sub._id)
      );

      return {
        subjectId: sub._id,
        subjectName: sub.name,
        maxMarks: subMarks?.maxMarks || 0,
        marksObtained: subMarks?.marksObtained || 0,
        percentage:
          subMarks?.maxMarks > 0
            ? Number(((subMarks.marksObtained / subMarks.maxMarks) * 100).toFixed(2))
            : 0,
        result:
          subMarks?.maxMarks
            ? subMarks.marksObtained >= subMarks.maxMarks * 0.33
              ? "PASS"
              : "FAIL"
            : "",
      };
    });

    examWiseData.push({
      examId: exam._id,
      examName: exam.examMasterId?.examName,
      examType: exam.examMasterId?.type,
      fromDate: exam.fromDate,
      toDate: exam.toDate,
      subjects: subjectWiseData,

      totalObtained: ms?.totalObtainedMarks || 0,
      totalMarks: ms?.totalMarks || 0,
      percentage: ms?.percentage || 0,
      result: ms?.result || "",
    });
  }

  // 🔥 OVERALL SUMMARY (All Exams Combined)
  let overallTotalObtained = 0;
  let overallTotalMarks = 0;

  examWiseData.forEach((e) => {
    overallTotalObtained += e.totalObtained;
    overallTotalMarks += e.totalMarks;
  });

  const overallPercentage =
    overallTotalMarks > 0
      ? Number(((overallTotalObtained / overallTotalMarks) * 100).toFixed(2))
      : 0;




  const finalResponse = {
    studentDetails: {
      studentId: student._id,
      name: `${student.firstName} ${student.middleName || ""} ${student.lastName}`,
      rollNumber: student.rollNumber,
      profilePic: student.profilePic,
      fatherName: student.fatherName,
      motherName: student.motherName,
      dob: student.dob,
      session: student.session?.name,
      class: student.currentClass?.name,
      classId: student.currentClass?._id,
      section: student.currentSection?.name,
      sectionId: student.currentSection?._id,
      stream: student.stream?.name || "",
      streamId: student.stream?._id || "",
    },



    subjects: subjects.map((s) => ({
      subjectId: s._id,
      name: s.name,
    })),

    exams: examWiseData,

    overallSummary: {
      overallTotalObtained,
      overallTotalMarks,
      overallPercentage,
      overallResult: overallPercentage >= 33 ? "PASS" : "FAIL",
    },
  };

  return res.status(200).json(
    new apiResponse(200, finalResponse, "Full marksheet fetched successfully")
  );
});


const updateStudentMarks = asyncHandler(async (req, res) => {
  const {
    studentId,
    examListId,
    sessionId,
    classId,
    sectionId,
    streamId,
    subjects
  } = req.body;

  if (!studentId || !examListId || !sessionId) {
    return res.status(400).json(
      new apiResponse(400, null, "studentId, examListId & sessionId required")
    );
  }

  if (!Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json(
      new apiResponse(400, null, "Subjects array required")
    );
  }

  // 🔥 FIND EXISTING MARKSHEET OR CREATE NEW
  let marksheet = await Marksheet.findOne({
    studentId,
    examListId,
    sessionId
  });

  if (!marksheet) {
    marksheet = new Marksheet({
      studentId,
      examListId,
      sessionId,
      classId,
      sectionId,
      streamId,
      subjects: []
    });
  }

  // 🔥 UPDATE SUBJECT MARKS
  subjects.forEach((sub) => {
    const existing = marksheet.subjects.find(
      (s) => String(s.subjectId) === String(sub.subjectId)
    );

    if (existing) {
      existing.maxMarks = sub.maxMarks;
      existing.marksObtained = sub.marksObtained;
    } else {
      marksheet.subjects.push({
        subjectId: sub.subjectId,
        maxMarks: sub.maxMarks,
        marksObtained: sub.marksObtained
      });
    }
  });

  // 🔥 RECALCULATE TOTALS
  let totalObtained = 0;
  let totalMarks = 0;

  marksheet.subjects.forEach((s) => {
    totalObtained += Number(s.marksObtained || 0);
    totalMarks += Number(s.maxMarks || 0);
  });

  const percentage =
    totalMarks > 0 ? Number(((totalObtained / totalMarks) * 100).toFixed(2)) : 0;

  marksheet.totalObtainedMarks = totalObtained;
  marksheet.totalMarks = totalMarks;
  marksheet.percentage = percentage;
  marksheet.result = percentage >= 33 ? "PASS" : "FAIL";

  await marksheet.save();

  return res.status(200).json(
    new apiResponse(200, marksheet, "Marks updated successfully")
  );
});



/* ================= GET ALL MARKSHEET ================= */
const getAllMarks = asyncHandler(async (req, res) => {
  const {
    examListId,
    classId,
    sectionId,
    streamId,
    studentId,
    result,
    page = 1,
    limit = 10,
    isPagination = "true",
    search = "",
    sessionId = "",
  } = req.query;

  const match = {};

  // ===== Filters =====
  if (examListId && mongoose.Types.ObjectId.isValid(examListId)) {
    match.examListId = new mongoose.Types.ObjectId(examListId);
  }
  if (classId && mongoose.Types.ObjectId.isValid(classId)) {
    match.classId = new mongoose.Types.ObjectId(classId);
  }
  if (sectionId && mongoose.Types.ObjectId.isValid(sectionId)) {
    match.sectionId = new mongoose.Types.ObjectId(sectionId);
  }

  if (streamId && mongoose.Types.ObjectId.isValid(streamId)) {
    match.streamId = new mongoose.Types.ObjectId(streamId);
  }

  if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
    match.studentId = new mongoose.Types.ObjectId(studentId);
  }
  if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
    match.sessionId = new mongoose.Types.ObjectId(sessionId);
  }

  if (result) {
    match.result = result;
  }

  // ===== Search =====
  if (search) {
    match.$or = [
      { "student.firstName": { $regex: search, $options: "i" } },
      { "student.lastName": { $regex: search, $options: "i" } },
      { "student.rollNumber": { $regex: search, $options: "i" } },
      { "examMaster.examName": { $regex: search, $options: "i" } },
      { "examMaster.category": { $regex: search, $options: "i" } },
    ];
  }

  // ===== Count total =====
  const total = await Marksheet.countDocuments(match);

  // ===== Pagination =====
  const skip = isPagination === "true" ? (page - 1) * limit : 0;
  const lim = isPagination === "true" ? Number(limit) : total;

  // ===== Fetch marksheets with populate =====
  const marksheets = await Marksheet.find(match)
    .populate({
      path: "examListId",
      populate: { path: "examMasterId" }, // populate examMaster inside examList
    })
    .populate("studentId") // student info
    .populate("classId") // class info
    .populate("sectionId")
    .populate("streamId")
    .populate({
      path: "studentId",
      populate: { path: "currentSection", model: "Section" }, // populate section
    })
    .populate({
      path: "subjects.subjectId", // populate subjects array
      model: "Subject",
    })
    .populate("sessionId")
    .skip(skip)
    .limit(lim)
    .sort({ createdAt: -1 });

  // ===== Format response =====
  const formatted = marksheets.map((m) => ({
    _id: m._id,
    createdAt: m.createdAt,
    totalObtainedMarks: m.totalObtainedMarks,
    totalMarks: m.totalMarks,
    percentage: m.percentage,
    result: m.result,

    exam: {
      _id: m.examListId?.examMasterId?._id || null,
      examName: m.examListId?.examMasterId?.examName || "",
      category: m.examListId?.examMasterId?.category || "",
      fromDate: m.examListId?.fromDate || "",
      toDate: m.examListId?.toDate || "",
    },

    student: {
      _id: m.studentId?._id || null,
      studentId: m.studentId?.studentId || "",
      rollNumber: m.studentId?.rollNumber || "",
      name: `${m.studentId?.firstName || ""} ${m.studentId?.lastName || ""}`.trim(),
      fatherName: m.studentId?.fatherName || "",
      currentClass: m.classId?.name || "",
      currentSection: m.studentId?.currentSection?.name || "",
    },
    session: {
      _id: m.sessionId?._id || null,
      name: m.sessionId?.sessionName || "",
    },

    class: {
      _id: m.classId?._id || null,
      className: m.classId?.name || "",
    },
    section: {
      _id: m.sectionId?._id || null,
      sectionName: m.sectionId?.name || "",
    },
    stream: m.streamId
      ? {
        _id: m.streamId?._id,
        name: m.streamId?.name,
      }
      : null,

    // subjects: m.subjects.map((s) => ({
    //   subjectId: s.subjectId?._id || null,
    //   subjectName: s.subjectId?.name || "",
    //   marksObtained: s.marksObtained,
    //   maxMarks: s.maxMarks,
    // })),
    subjects: m.subjects.map((s) => {
      const subjectPercentage =
        s.maxMarks > 0 ? (s.marksObtained / s.maxMarks) * 100 : 0;

      return {
        subjectId: s.subjectId?._id || null,
        subjectName: s.subjectId?.name || "",
        marksObtained: s.marksObtained,
        maxMarks: s.maxMarks,
        subjectPercentage: Number(subjectPercentage.toFixed(2)),
        subjectResult: subjectPercentage >= 33 ? "PASS" : "FAIL",
      };
    }),
  }));

  res.status(200).json(
    new apiResponse(
      200,
      {
        marksheets: formatted,
        totalMarksheets: total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
      "Marksheets fetched successfully",
    ),
  );
});

/* ================= GET MARKSHEET BY ID ================= */
const getMarksById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Marksheet ID"));
  }

  const marksheet = await Marksheet.findById(id)
    .populate("examListId")
    .populate("studentId")
    .populate("classId")
    .populate("streamId")
    .populate("sessionId")
    .populate("subjects.subjectId");

  if (!marksheet) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Marksheet not found"));
  }

  const formatted = {
    ...marksheet.toObject(),

    subjects: marksheet.subjects.map((s) => {
      const subjectPercentage =
        s.maxMarks > 0 ? (s.marksObtained / s.maxMarks) * 100 : 0;

      return {
        subjectId: s.subjectId?._id || null,
        subjectName: s.subjectId?.name || "",
        marksObtained: s.marksObtained,
        maxMarks: s.maxMarks,
        subjectPercentage: Number(subjectPercentage.toFixed(2)),
        subjectResult: subjectPercentage >= 33 ? "PASS" : "FAIL",
      };
    }),
  };

  res
    .status(200)
    .json(new apiResponse(200, formatted, "Marksheet fetched successfully"));
});

/* ================= UPDATE MARKSHEET ================= */
const updateMarks = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subjects } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Marksheet ID"));
  }

  const marksheet = await Marksheet.findById(id);
  if (!marksheet) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Marksheet not found"));
  }

  let totalObtained = 0;
  let totalMax = 0;

  subjects.forEach((sub) => {
    totalObtained += sub.marksObtained || 0;
    totalMax += sub.maxMarks || 0;
  });

  const percentage =
    totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(2)) : 0;

  marksheet.subjects = subjects;
  marksheet.totalObtainedMarks = totalObtained;
  marksheet.totalMarks = totalMax;
  marksheet.percentage = percentage;
  marksheet.result = percentage >= 33 ? "PASS" : "FAIL";

  await marksheet.save();
  const formatted = {
    ...marksheet.toObject(),

    subjects: marksheet.subjects.map((s) => {
      const subjectPercentage =
        s.maxMarks > 0 ? (s.marksObtained / s.maxMarks) * 100 : 0;

      return {
        subjectId: s.subjectId?._id || null,
        subjectName: s.subjectId?.name || "",
        marksObtained: s.marksObtained,
        maxMarks: s.maxMarks,
        subjectPercentage: Number(subjectPercentage.toFixed(2)),
        subjectResult: subjectPercentage >= 33 ? "PASS" : "FAIL",
      };
    }),
  };
  res
    .status(200)
    .json(new apiResponse(200, formatted, "Marksheet updated successfully"));
});

/* ================= DELETE MARKSHEET ================= */
const deleteMarks = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Marksheet ID"));
  }

  const marksheet = await Marksheet.findByIdAndDelete(id);

  if (!marksheet) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Marksheet not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, marksheet, "Marksheet deleted successfully"));
});

export { updateStudentMarks, getClassWiseMarksSummary, getFullMarksheet, createMarks, getAllMarks, getMarksById, updateMarks, deleteMarks };
