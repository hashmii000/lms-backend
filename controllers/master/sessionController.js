import Session from "../../models/master/Session.model.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import mongoose from "mongoose";

const createSession = asyncHandler(async (req, res) => {
  const { sessionName, isCurrent, isActive } = req.body;

  if (!sessionName) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Session name is required"));
  }
  const existingSession = await Session.findOne({
    sessionName: sessionName.trim(),
  });

  if (existingSession) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Session already exists"));
  }

  // Agar new session current hai → purane current ko false karo
  if (isCurrent === true) {
    await Session.updateMany({ isCurrent: true }, { isCurrent: false });
  }

  const newSession = await Session.create({
    sessionName: sessionName.trim(),
    isCurrent: isCurrent ?? false,
    isActive: isActive ?? true,
  });

  res
    .status(201)
    .json(new apiResponse(201, newSession, "Session created successfully"));
});

const getAllSessions = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      sortBy, // optional (recent / oldest)
      isActive,
      isCurrent,
    } = req.query;


    const match = {};


    // 🔹 isActive filter
    if (isActive !== undefined) {
      match.isActive = isActive === "true";
    }


    // 🔹 isCurrent filter
    if (isCurrent !== undefined && isCurrent !== "") {
      match.isCurrent = isCurrent === "true";
    }


    let pipeline = [{ $match: match }];


    // 🔍 Search
    if (search) {
      pipeline.push({
        $match: {
          sessionName: {
            $regex: new RegExp(search.trim(), "i"),
          },
        },
      });
    }


    /* 🔥 SORTING LOGIC 🔥
    Default: ORDER wise (like Class)
    Secondary: createdAt
    */
    if (sortBy === "recent") {
      pipeline.push({ $sort: { order: 1, createdAt: -1 } });
    } else if (sortBy === "oldest") {
      pipeline.push({ $sort: { order: 1, createdAt: 1 } });
    } else {
      // ✅ Default (Class jaisa)
      pipeline.push({ $sort: { order: 1, createdAt: 1 } });
    }


    // 📊 Total count (without pagination)
    const totalArr = await Session.aggregate([
      ...pipeline,
      { $count: "count" },
    ]);
    const totalSessions = totalArr[0]?.count || 0;


    // 📄 Pagination
    if (isPagination === "true") {
      pipeline.push(
        { $skip: (Number(page) - 1) * Number(limit) },
        { $limit: Number(limit) }
      );
    }


    const sessions = await Session.aggregate(pipeline);


    res.status(200).json(
      new apiResponse(
        200,
        {
          sessions,
          totalSessions,
          totalPages: Math.ceil(totalSessions / limit),
          currentPage: Number(page),
        },
        "Sessions fetched successfully"
      )
    );
  } catch (error) {
    res.status(500).json(
      new apiResponse(500, null, error.message)
    );
  }
});

const getSessionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid session ID"));
  }

  const session = await Session.findById(id);

  if (!session) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Session not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, session, "Session fetched successfully"));
});

const updateSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isCurrent } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid session ID"));
  }

  if (isCurrent === true) {
    await Session.updateMany({ _id: { $ne: id } }, { isCurrent: false });
  }

  const updatedSession = await Session.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updatedSession) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Session not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, updatedSession, "Session updated successfully"));
});

const deleteSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid session ID"));
  }

  const session = await Session.findById(id);

  if (!session) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Session not found"));
  }

  // ❌ Current session delete not allowed
  if (session.isCurrent) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Current session cannot be deleted"));
  }

  await session.deleteOne();

  res
    .status(200)
    .json(new apiResponse(200, session, "Session deleted successfully"));
});


const migrateSessionOrder = asyncHandler(async (req, res) => {
  const { sessions } = req.body;

  const bulkOps = sessions.map((route, index) => ({
    updateOne: {
      filter: { _id: route.id },
      update: {
        $set: { order: route.order },
      },
    },
  }));

  if (bulkOps.length > 0) {
    await Session.bulkWrite(bulkOps);
  }




  return res.status(200).json(
    new apiResponse(
      200,
      null,
      "Session order updated successfully"
    )
  );
});


export {
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  deleteSession,
  migrateSessionOrder
};
