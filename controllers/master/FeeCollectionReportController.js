import mongoose from "mongoose";
import StudentPayment from "../../models/master/StudentPayment.model.js";
import StudentEnrollment from "../../models/student/StudentEnrolment.modal.js";
import Class from "../../models/master/Class.modal.js";
import User from "../../models/User.modal.js"; // clerk
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";

/* ================= FEE COLLECTION REPORT ================= */
const feeCollectionReport = asyncHandler(async (req, res) => {
  const {
    sessionId,
    fromDate,
    toDate,
    classId,
    studentId,
    clerkId,
    page = 1,
    limit = 10,
  } = req.query;

  /* ================= VALIDATION ================= */
  if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Valid sessionId is required"));
  }

  if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid classId"));
  }

  if (clerkId && !mongoose.Types.ObjectId.isValid(clerkId)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid clerkId"));
  }
  if (studentId && !mongoose.Types.ObjectId.isValid(studentId)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid studentId"));
  }

  /* ================= BUILD FILTER ================= */
  const match = {
    sessionId: new mongoose.Types.ObjectId(sessionId),
  };

  if (classId) {
    match.classId = new mongoose.Types.ObjectId(classId);
  }

  if (clerkId) {
    match.clerkId = new mongoose.Types.ObjectId(clerkId);
  }
  if (studentId) {
    match.studentId = new mongoose.Types.ObjectId(studentId);
  }

  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      match.createdAt.$lte = end;
    }
  }

  /* ================= AGGREGATION ================= */
  const pipeline = [
    { $match: match },

    // student
    // student enrollment (SESSION-SAFE)
{
  $lookup: {
    from: "studentenrollments",
    let: { studentId: "$studentId", sessionId: "$sessionId" },
    pipeline: [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ["$userId", "$$studentId"] },
              { $eq: ["$session", "$$sessionId"] },
            ],
          },
        },
      },
    ],
    as: "student",
  },
},
{
  $unwind: {
    path: "$student",
    preserveNullAndEmptyArrays: true, // 🔑 CRITICAL
  },
},

    // class
    {
      $lookup: {
        from: "classes",
        localField: "classId",
        foreignField: "_id",
        as: "class",
      },
    },
    {
      $unwind: {
        path: "$class",
        preserveNullAndEmptyArrays: true,
      },
    },

    // clerk
    {
      $lookup: {
        from: "users",
        localField: "clerkId",
        foreignField: "_id",
        as: "clerk",
      },
    },
    {
      $unwind: {
        path: "$clerk",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        receiptNo: 1,
        amountPaid: 1,
        paymentMode: 1,
        paymentStatus: 1,
        createdAt: 1,
        // studentName: {
        //   $concat: ["$student.firstName", " ", "$student.lastName"],
        // },
        className: "$class.name",
        section: "$student.currentSection",
        clerkName: "$clerk.name",
      },
    },

    { $sort: { createdAt: -1 } },
  ];

/* ================= TOTAL SUMMARY ================= */
const summaryAgg = await StudentPayment.aggregate([
  {
    $match: {
      ...match,                 // existing filters (sessionId, date range, etc.)
      paymentStatus: "SUCCESS", //  IMPORTANT
    },
  },
  {
    $group: {
      _id: null,
      totalCollection: { $sum: "$amountPaid" },
      totalReceipts: { $sum: 1 },
    },
  },
]);

const summary = summaryAgg[0] || {
  totalCollection: 0,
  totalReceipts: 0,
};

  /* ================= PAGINATION ================= */
  const skip = (Number(page) - 1) * Number(limit);

  const list = await StudentPayment.aggregate([
    ...pipeline,
    { $skip: skip },
    { $limit: Number(limit) },
  ]);

  const totalRows = summary.totalReceipts;
  const totalPages = Math.ceil(totalRows / limit);

  /* ================= RESPONSE ================= */
  res.status(200).json(
    new apiResponse(
      200,
      {
        summary,
        pagination: {
          totalRows,
          totalPages,
          currentPage: Number(page),
          perPage: Number(limit),
        },
        list,
      },
      "Fee collection report fetched successfully"
    )
  );
});

export { feeCollectionReport };