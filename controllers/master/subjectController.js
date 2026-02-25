import Subject from "../../models/master/Subject.model.js";
import Class from "../../models/master/Class.modal.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import mongoose from "mongoose";

/* ================= CREATE SUBJECT ================= */
const createSubject = asyncHandler(async (req, res) => {
  const { name, classes, streamId, session } = req.body;

  if (!name || !name.trim()) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Subject name is required"));
  }

  if (!classes || !mongoose.Types.ObjectId.isValid(classes)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Valid class ID is required"));
  }
  if (!session || !mongoose.Types.ObjectId.isValid(session)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Valid session ID is required"));
  }
  const classData = await Class.findById(classes);
  if (!classData) {
    return res.status(404).json(new apiResponse(404, null, "Class not found"));
  }

  // 🔒 0–8 → stream not allowed
  if ((!classData.isSenior && classData.order <= 8) && streamId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Stream not allowed for this class"));
  }

  // stream validation (if provided)
  if (streamId && !mongoose.Types.ObjectId.isValid(streamId)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid stream ID"));
  }

  const duplicate = await Subject.findOne({
    name: name.trim(),
    classes,
    streamId: classData.isSenior ? streamId || null : null,

    // streamId: classData.order <= 8 ? null : streamId || null,
  });

  if (duplicate) {
    return res
      .status(409)
      .json(
        new apiResponse(
          409,
          null,
          "Subject already exists for this class/stream",
        ),
      );
  }

  const subject = await Subject.create({
    name: name.trim(),
    classes,
    session,
    streamId: classData.isSenior ? streamId || null : null,
    // streamId: classData.order <= 8 ? null : streamId || null,
    isActive: true,
  });

  const populated = await Subject.findById(subject._id)
    .populate("classes", "name order isSenior")
    .populate("streamId", "name")
    .populate("session", "sessionName");
  res
    .status(201)
    .json(new apiResponse(201, populated, "Subject created successfully"));
});

/* ================= GET ALL SUBJECTS ================= */
const getAllSubjects = asyncHandler(async (req, res) => {
  const {
    classId,
    streamId,
    session,
    isActive,
    search,
    page = 1,
    limit = 10,
    isPagination = "true",
    sortBy = "recent",
  } = req.query;

  const match = {};

  if (isActive !== undefined && isActive !== "") {
    match.isActive = isActive === "true";
  }

  if (classId && mongoose.Types.ObjectId.isValid(classId)) {
    match.classes = new mongoose.Types.ObjectId(classId);
  }

  if (streamId && mongoose.Types.ObjectId.isValid(streamId)) {
    match.streamId = new mongoose.Types.ObjectId(streamId);
  }

  if (session && mongoose.Types.ObjectId.isValid(session)) {
    match.session = new mongoose.Types.ObjectId(session);
  }
  const pipeline = [];

  pipeline.push({ $match: match });

  // join class
  pipeline.push({
    $lookup: {
      from: "classes",
      localField: "classes",
      foreignField: "_id",
      as: "class",
    },
  });

  pipeline.push({
    $unwind: {
      path: "$class",
      preserveNullAndEmptyArrays: false,
    },
  });

  // join stream
  pipeline.push({
    $lookup: {
      from: "streams",
      localField: "streamId",
      foreignField: "_id",
      as: "stream",
    },
  });

  pipeline.push({
    $unwind: {
      path: "$stream",
      preserveNullAndEmptyArrays: true,
    },
  });
  // join session
  pipeline.push({
    $lookup: {
      from: "sessions",
      localField: "session",
      foreignField: "_id",
      as: "session",
    },
  });

  pipeline.push({
    $unwind: {
      path: "$session",
      preserveNullAndEmptyArrays: true,
    },
  });

  // search
  if (search) {
    pipeline.push({
      $match: {
        name: { $regex: search, $options: "i" },
      },
    });
  }

  // sorting
  pipeline.push({
    $sort: sortBy === "oldest" ? { createdAt: 1 } : { createdAt: -1 },
  });

  // projection
  pipeline.push({
    $project: {
      name: 1,
      isActive: 1,
      createdAt: 1,
      class: {
        _id: "$class._id",
        name: "$class.name",
        order: "$class.order",
        isSenior: "$class.isSenior",
      },
      stream: {
        _id: "$stream._id",
        name: "$stream.name",
      },
      session: {
        _id: "$session._id",
        sessionName: "$session.sessionName",
      },
    },
  });

  // count
  const countPipeline = [...pipeline, { $count: "count" }];
  const countResult = await Subject.aggregate(countPipeline);
  const total = countResult[0]?.count || 0;

  // pagination
  if (isPagination === "true") {
    pipeline.push(
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) },
    );
  }

  const subjects = await Subject.aggregate(pipeline);

  res.status(200).json(
    new apiResponse(
      200,
      {
        subjects,
        totalSubjects: total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
      "Subjects fetched successfully",
    ),
  );
});

/* ================= GET SUBJECT BY ID ================= */
const getSubjectById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid subject ID"));
  }

  const subject = await Subject.findById(id)
    .populate("classes", "name order")
    .populate("streamId", "name");

  if (!subject) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Subject not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, subject, "Subject fetched successfully"));
});
/* ================= UPDATE SUBJECT ================= */
const updateSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, classes, streamId,session  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid subject ID"));
  }

  let classData = null;

  if (classes) {
    if (!mongoose.Types.ObjectId.isValid(classes)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid class ID"));
    }

    classData = await Class.findById(classes);
    if (!classData) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Class not found"));
    }

    if ((!classData.isSenior && classData.order <= 8) && streamId) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Stream not allowed for class 0–8"));
    }
  }

  const updated = await Subject.findByIdAndUpdate(
    id,
    {
      ...req.body,
      streamId: classData && classData.isSenior ? streamId || null : null,
      session,
    },
    { new: true, runValidators: true },
  )
    .populate("classes", "name order isSenior")
    .populate("streamId", "name")
    .populate("session", "sessionName");

  if (!updated) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Subject not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, updated, "Subject updated successfully"));
});

/* ================= DELETE SUBJECT ================= */
const deleteSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid subject ID"));
  }

  const subject = await Subject.findByIdAndDelete(id);

  if (!subject) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Subject not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, subject, "Subject deleted successfully"));
});

export {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
};
