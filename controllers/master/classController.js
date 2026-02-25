import Class from "../../models/master/Class.modal.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import mongoose from "mongoose";

/* ================= CREATE CLASS ================= */
const createClass = asyncHandler(async (req, res) => {
  try {
    const { name, isActive, session, isSenior } = req.body;

    if (!name || name.trim() === "") {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Class name is required"));
    }
    if (!session) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Session is required"));
    }

    // Optional: Duplicate check
    const existingClass = await Class.findOne({ name: name.trim(), session });
    if (existingClass) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Class already exists"));
    }

    const newClass = await Class.create({
      name: name.trim(),
      session,
      isSenior: isSenior !== undefined ? isSenior : false,
      isActive: isActive !== undefined ? isActive : true,
    });

    res
      .status(201)
      .json(new apiResponse(201, newClass, "Class created successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, error.message));
  }
});

/* ================= GET ALL CLASSES ================= */
const getAllClasses = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search = "",
      isActive,
      session,
      isSenior,
    } = req.query;

    const match = {};

    // ✅ Active filter
    if (isActive !== undefined) {
      match.isActive = isActive === "true";
    }

    // ✅ Search filter
    if (search.trim()) {
      match.name = { $regex: search.trim(), $options: "i" };
    }
    // ✅ Session filter
    if (session) {
      match.session = new mongoose.Types.ObjectId(session);
    }

    // ✅ isSenior filter
    if (isSenior !== undefined) {
      match.isSenior = isSenior === "true";
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "sessions",
          localField: "session",
          foreignField: "_id",
          as: "session",
        },
      },
      {
        $unwind: "$session",
      },

      // 🔥 ORDER WISE SORT (MAIN REQUIREMENT)
      { $sort: { order: 1, createdAt: 1 } },
    ];

    // 📊 Total count
    const totalData = await Class.aggregate([
      { $match: match },
      { $count: "count" },
    ]);
    const totalClasses = totalData[0]?.count || 0;

    // 📄 Pagination
    if (isPagination === "true") {
      pipeline.push(
        { $skip: (Number(page) - 1) * Number(limit) },
        { $limit: Number(limit) },
      );
    }

    const classes = await Class.aggregate(pipeline);
    // const classData = classes[0] || null;

    res.status(200).json(
      new apiResponse(
        200,
        {
          // classes: classData,
          classes,
          totalClasses,
          totalPages: Math.ceil(totalClasses / limit),
          currentPage: Number(page),
        },
        "Classes fetched successfully",
      ),
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, error.message));
  }
});

/* ================= GET CLASS BY ID ================= */
const getClassById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid class ID"));
    }

    const classData = await Class.findById(id);

    if (!classData) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Class not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, classData, "Class fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, error.message));
  }
});

/* ================= UPDATE CLASS ================= */
const updateClass = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid class ID"));
    }

    const updatedClass = await Class.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedClass) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Class not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, updatedClass, "Class updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, error.message));
  }
});

/* ================= DELETE CLASS ================= */
const deleteClass = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid class ID"));
    }

    const deletedClass = await Class.findByIdAndDelete(id);

    if (!deletedClass) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Class not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, deletedClass, "Class deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, error.message));
  }
});

const migrateClassOrder = asyncHandler(async (req, res) => {
  const { classes } = req.body;

  const bulkOps = classes.map((route, index) => ({
    updateOne: {
      filter: { _id: route.id },
      update: {
        $set: { order: route.order },
      },
    },
  }));

  if (bulkOps.length > 0) {
    await Class.bulkWrite(bulkOps);
  }

  if (!Array.isArray(classes) || classes.length === 0) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "classes array is required"));
  }

  return res
    .status(200)
    .json(new apiResponse(200, null, "Class order updated successfully"));
});

export {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
  migrateClassOrder,
};
