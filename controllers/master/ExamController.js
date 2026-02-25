import Exam from "../../models/master/Exam.model.js";
import Class from "../../models/master/Class.modal.js";
import Section from "../../models/master/Section.modal.js";
import Session from "../../models/master/Session.model.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import mongoose from "mongoose";

/* ================= CREATE EXAM MASTER ================= */
const createExam = asyncHandler(async (req, res) => {
  const { examName, category, session } = req.body;

  if (!examName || !examName.trim()) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Exam name is required"));
  }

  if (!session || !mongoose.Types.ObjectId.isValid(session)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Valid session is required"));
  }

  if (category && !["EXAM", "TEST"].includes(category)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid category"));
  }

  // Check for duplicate examName
  const existingExam = await Exam.findOne({
    examName: { $regex: new RegExp(`^${examName.trim()}$`, "i") }, // case-insensitive
  });

  if (existingExam) {
    return res
      .status(409)
      .json(new apiResponse(409, null, "Exam name already exists"));
  }

  const exam = await Exam.create({
    examName: examName.trim(),
    category,
    isActive: true,
    session,
  });

  res.status(201).json(new apiResponse(201, exam, "Exam created successfully"));
});

/* ================= GET ALL EXAM MASTERS ================= */
const getAllExams = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search = "",
      isActive,
      session,
    } = req.query;

    const match = {};

    // ✅ Active filter (same as class)
    if (isActive !== undefined) {
      match.isActive = isActive === "true";
    }

    if (session && mongoose.Types.ObjectId.isValid(session)) {
      match.session = new mongoose.Types.ObjectId(session);
    }
    // ✅ Search filter (same style)
    if (search.trim()) {
      match.$or = [
        { examName: { $regex: search.trim(), $options: "i" } },
        { category: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const pipeline = [
      { $match: match },

      // 🔥 ORDER WISE SORT (MAIN REQUIREMENT)
      { $sort: { order: 1, createdAt: 1 } },
    ];

    // 📊 Total count (same as class)
    const totalData = await Exam.aggregate([
      { $match: match },
      { $count: "count" },
    ]);
    const totalExams = totalData[0]?.count || 0;

    // 📄 Pagination (same)
    if (isPagination === "true") {
      pipeline.push(
        { $skip: (Number(page) - 1) * Number(limit) },
        { $limit: Number(limit) },
      );
    }

    const exams = await Exam.aggregate(pipeline);

    res.status(200).json(
      new apiResponse(
        200,
        {
          exams,
          totalExams,
          totalPages: Math.ceil(totalExams / limit),
          currentPage: Number(page),
        },
        "Exams fetched successfully",
      ),
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, error.message));
  }
});

/* ================= GET EXAM MASTER BY ID ================= */
const getExamById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid Exam ID"));
  }

  const exam = await Exam.findById(id);

  if (!exam) {
    return res.status(404).json(new apiResponse(404, null, "Exam not found"));
  }

  res.status(200).json(new apiResponse(200, exam, "Exam fetched successfully"));
});

/* ================= UPDATE EXAM MASTER ================= */
const updateExam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { examName, category, isActive } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid Exam ID"));
  }

  const exam = await Exam.findById(id);
  if (!exam) {
    return res.status(404).json(new apiResponse(404, null, "Exam not found"));
  }

  // Duplicate check if examName is updated
  if (examName && examName.trim() !== exam.examName) {
    const existingExam = await Exam.findOne({
      examName: { $regex: new RegExp(`^${examName.trim()}$`, "i") },
      _id: { $ne: id },
    });

    if (existingExam) {
      return res
        .status(409)
        .json(new apiResponse(409, null, "Exam name already exists"));
    }
  }

  exam.examName = examName ?? exam.examName;
  exam.category = category ?? exam.category;
  exam.isActive = isActive ?? exam.isActive;

  await exam.save();

  res.status(200).json(new apiResponse(200, exam, "Exam updated successfully"));
});

/* ================= DELETE EXAM MASTER ================= */
const deleteExam = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid Exam ID"));
  }

  const exam = await Exam.findByIdAndDelete(id);

  if (!exam) {
    return res.status(404).json(new apiResponse(404, null, "Exam not found"));
  }

  res.status(200).json(new apiResponse(200, exam, "Exam deleted successfully"));
});

const migrateExamOrder = asyncHandler(async (req, res) => {
  const { exams } = req.body;

  const bulkOps = exams.map((route, index) => ({
    updateOne: {
      filter: { _id: route.id },
      update: {
        $set: { order: route.order },
      },
    },
  }));

  if (bulkOps.length > 0) {
    await Exam.bulkWrite(bulkOps);
  }

  // ❌ validation first (best practice)
  if (!Array.isArray(exams) || exams.length === 0) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "exams array is required"));
  }

  return res
    .status(200)
    .json(new apiResponse(200, null, "Exam order updated successfully"));
});

export {
  createExam,
  getAllExams,
  getExamById,
  updateExam,
  deleteExam,
  migrateExamOrder,
};
