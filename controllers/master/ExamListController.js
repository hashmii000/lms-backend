import ExamList from "../../models/master/ExamList.model.js";
import Exam from "../../models/master/Exam.model.js";
import Class from "../../models/master/Class.modal.js";
import Section from "../../models/master/Section.modal.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import mongoose from "mongoose";

/* ================= CREATE EXAM LIST ================= */
const createExamList = asyncHandler(async (req, res) => {
  const { examMasterId, sessionId, classId, fromDate, toDate } = req.body;

  if (!examMasterId || !mongoose.Types.ObjectId.isValid(examMasterId)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Valid examMasterId is required"));
  }

  if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Valid classId is required"));
  }

  if (!fromDate || !toDate) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "fromDate and toDate are required"));
  }

  /* ===== DUPLICATE CHECK ===== */
  const alreadyExists = await ExamList.findOne({
    examMasterId,
    classId,
    sessionId: sessionId || null,
    isActive: true,
  });

  if (alreadyExists) {
    return res
      .status(409)
      .json(
        new apiResponse(409, null, "Exam already scheduled for this class"),
      );
  }

  const examList = await ExamList.create({
    examMasterId,
    sessionId: sessionId || null,
    classId,
    fromDate,
    toDate,
    isActive: true,
  });

  const populated = await ExamList.findById(examList._id)
    .populate("examMasterId", "examName category")
    .populate("classId", "name");

  res
    .status(201)
    .json(new apiResponse(201, populated, "Exam list created successfully"));
});

/* ================= GET ALL EXAM LIST ================= */
const getAllExamList = asyncHandler(async (req, res) => {
  const {
    classId,
    examMasterId,
    category,
    isActive,
    search,
    page = 1,
    limit = 10,
    isPagination = "true",
    sortBy = "recent",
    session,
  } = req.query;

  const match = {};
  if (session && mongoose.Types.ObjectId.isValid(session)) {
  match.sessionId = new mongoose.Types.ObjectId(session);
}

  if (isActive !== undefined) {
    match.isActive = isActive === "true";
  }

  if (classId && mongoose.Types.ObjectId.isValid(classId)) {
    match.classId = new mongoose.Types.ObjectId(classId);
  }

  if (examMasterId && mongoose.Types.ObjectId.isValid(examMasterId)) {
    match.examMasterId = new mongoose.Types.ObjectId(examMasterId);
  }

  const pipeline = [
    { $match: match },

    /* ===== Exam Master ===== */
    {
      $lookup: {
        from: "exammasters",
        localField: "examMasterId",
        foreignField: "_id",
        as: "examMaster",
      },
    },
    { $unwind: "$examMaster" },

    /* ===== Class ===== */
    {
      $lookup: {
        from: "classes",
        localField: "classId",
        foreignField: "_id",
        as: "class",
      },
    },
    { $unwind: "$class" },
  ];

  /* ===== CATEGORY FILTER (AFTER LOOKUP) ===== */
  if (category) {
    pipeline.push({
      $match: {
        "examMaster.category": category,
      },
    });
  }
  /* ===== SEARCH ===== */
  if (search) {
    pipeline.push({
      $match: {
        "examMaster.examName": { $regex: search, $options: "i" },
      },
    });
  }

  /* ===== SORT ===== */
  pipeline.push({
    $sort: sortBy === "oldest" ? { createdAt: 1 } : { createdAt: -1 },
  });

  /* ===== PROJECT ===== */
  pipeline.push({
    $project: {
      fromDate: 1,
      toDate: 1,
      isActive: 1,
      createdAt: 1,

      examMaster: {
        _id: "$examMaster._id",
        examName: "$examMaster.examName",
        category: "$examMaster.category",
      },

      class: {
        _id: "$class._id",
        className: "$class.name",
      },
    },
  });

  /* ===== COUNT ===== */
  const countPipeline = [...pipeline, { $count: "count" }];
  const countResult = await ExamList.aggregate(countPipeline);
  const total = countResult[0]?.count || 0;

  /* ===== PAGINATION ===== */
  if (isPagination === "true") {
    pipeline.push({ $skip: (page - 1) * limit }, { $limit: Number(limit) });
  }

  const examLists = await ExamList.aggregate(pipeline);

  res.status(200).json(
    new apiResponse(
      200,
      {
        examLists,
        totalExamLists: total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
      "Exam lists fetched successfully",
    ),
  );
});

/* ================= GET EXAM LIST BY ID ================= */
const getExamByIdList = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Exam List ID"));
  }

  const examList = await ExamList.findById(id)
    .populate("examMasterId", "examName category")
    .populate("classId", "name");

  if (!examList) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Exam List not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, examList, "Exam list fetched successfully"));
});

/* ================= UPDATE EXAM LIST ================= */
const updateExamList = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { examMasterId, sessionId, classId, fromDate, toDate, isActive } =
    req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Exam List ID"));
  }

  const examList = await ExamList.findById(id);
  if (!examList) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Exam List not found"));
  }

  examList.examMasterId = examMasterId ?? examList.examMasterId;
  examList.sessionId = sessionId ?? examList.sessionId;
  examList.classId = classId ?? examList.classId;
  examList.fromDate = fromDate ?? examList.fromDate;
  examList.toDate = toDate ?? examList.toDate;
  examList.isActive = isActive ?? examList.isActive;

  await examList.save();

  const populated = await ExamList.findById(id)
    .populate("examMasterId", "examName category")
    .populate("classId", "name");

  res
    .status(200)
    .json(new apiResponse(200, populated, "Exam list updated successfully"));
});

/* ================= DELETE EXAM LIST ================= */
const deleteExamList = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Exam List ID"));
  }

  const examList = await ExamList.findByIdAndDelete(id);

  if (!examList) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Exam List not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, examList, "Exam list deleted successfully"));
});

export {
  createExamList,
  getAllExamList,
  getExamByIdList,
  updateExamList,
  deleteExamList,
};
