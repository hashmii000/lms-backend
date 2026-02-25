import SubjectModel from "../models/master/Subject.model.js";
import Teacher from "../models/teacher/Teacher.modal.js";
import User from "../models/User.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

const generateEmployeeId = async () => {
  let isUnique = false;
  let employeeId;

  while (!isUnique) {
    const random = Math.floor(1000 + Math.random() * 9000);
    employeeId = `EMP-${random}`;

    const exists = await Teacher.findOne({ employeeId });
    if (!exists) isUnique = true;
  }

  return employeeId;
};

const createTeacher = asyncHandler(async (req, res) => {
  try {
    const {
      phone,
      firstName,
      middleName,
      lastName,
      dob,
      gender,
      category,
      profilePic,
      religion,
      caste,
      aadhaarNo,
      email,
      emergencyContact,
      address,
      dateOfJoining,
      department,
      designation,
      employmentType,
      subjects,
      medium,
      classesAssigned,
      house,
      shift,
      experience,
      totalExperience,
      salary,
      bankAccount,
      specialAllowance,
      remarks,
      documents,
      status,
    } = req.body;

    /* ================= VALIDATION ================= */

    if (!phone) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Phone is required"));
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Phone number must be 10 digits"));
    }

    if (!firstName) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "First name is required"));
    }

    if (!gender) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Gender is required"));
    }

    if (!medium || typeof medium !== "string" || medium.trim() === "") {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Medium is required"));
    }

    /* ================= CLASSES ASSIGNED (NO VALIDATION) ================= */
    let finalClassesAssigned = [];

    if (Array.isArray(classesAssigned) && classesAssigned.length > 0) {
      finalClassesAssigned = classesAssigned.map((cls) => ({
        session: cls.session || undefined,
        stream: cls.stream || undefined,
        classId: cls.classId || undefined,
        sectionId: cls.sectionId || undefined,
        subjectId: cls.subjectId || undefined,
        isClassTeacher: cls.isClassTeacher || false,
      }));
    }

    /* ================= GENERATE USER ================= */
    const employeeId = await generateEmployeeId();
    const password = `${firstName.toLowerCase()}@123`;

    const user = await User.create({
      phone,
      profilePic,
      userId: employeeId,
      name: `${firstName} ${lastName || ""}`.trim(),
      role: "Teacher",
      password,
      email,
    });

    /* ================= DUPLICATE CHECK ================= */
    const existingTeacher = await Teacher.findOne({ userId: user._id });
    if (existingTeacher) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Teacher already exists"));
    }

    /* ================= CREATE TEACHER ================= */
    const teacher = await Teacher.create({
      userId: user._id,
      phone,
      email,
      firstName,
      middleName,
      lastName,
      dob,
      gender,
      category,
      religion,
      profilePic,
      caste,
      aadhaarNo,
      emergencyContact,
      address,
      employeeId,
      dateOfJoining,
      department,
      designation,
      employmentType,
      subjects,
      medium,
      classesAssigned: finalClassesAssigned, // ✅ empty ya filled dono case
      house,
      shift,
      experience,
      totalExperience,
      salary,
      bankAccount,
      specialAllowance,
      remarks,
      documents,
      status,
    });

    return res.status(201).json(
      new apiResponse(
        201,
        {
          teacher,
          credentials: {
            phone: user.phone,
            password: user.password,
          },
        },
        "Teacher created successfully",
      ),
    );
  } catch (error) {
    return res.status(500).json(new apiResponse(500, null, error.message));
  }
});

export const assignClassToTeacher = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;

  const {
    session,
    stream,
    classId,
    sectionId,
    subjectId,
    isClassTeacher = false,
  } = req.body;

  /* ================= REQUIRED VALIDATION ================= */
  if (!session || !classId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "session and classId are required"));
  }

  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Teacher not found"));
  }

  /* ================= CLEAN OPTIONAL FIELDS ================= */
  const cleanStream = stream && stream.trim() !== "" ? stream : null;
  const cleanSectionId =
    sectionId && sectionId.trim() !== "" ? sectionId : null;
  const cleanSubjectId =
    subjectId && subjectId.trim() !== "" ? subjectId : null;

  /* ================= DUPLICATE CHECK ================= */
  const alreadyAssigned = teacher.classesAssigned.some((cls) => {
    return (
      cls.session?.toString() === session &&
      cls.classId?.toString() === classId &&
      (cls.sectionId?.toString() || null) === cleanSectionId &&
      (cls.subjectId?.toString() || null) === cleanSubjectId &&
      (cls.stream?.toString() || null) === cleanStream
    );
  });

  if (alreadyAssigned) {
    return res
      .status(409)
      .json(
        new apiResponse(
          409,
          null,
          "This subject/class/section/stream is already assigned for the same session",
        ),
      );
  }

  /* ================= ADD ================= */
  teacher.classesAssigned.push({
    session,
    stream: cleanStream,
    classId,
    sectionId: cleanSectionId,
    subjectId: cleanSubjectId,
    isClassTeacher,
  });

  await teacher.save();

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        teacher.classesAssigned,
        "Class assigned successfully",
      ),
    );
});

export const getAssignedClassesByTeacherSession123 = asyncHandler(
  async (req, res) => {
    const { teacherId } = req.params;
    const { session } = req.query;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid teacherId"));
    }

    if (!session) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "session is required"));
    }

    const pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(teacherId),
        },
      },

      /* ===== FILTER SESSION ===== */
      {
        $addFields: {
          classesAssigned: {
            $filter: {
              input: "$classesAssigned",
              as: "cls",
              cond: {
                $eq: ["$$cls.session", new mongoose.Types.ObjectId(session)],
              },
            },
          },
        },
      },

      /* ===== LOOKUPS ===== */
      {
        $lookup: {
          from: "sessions",
          localField: "classesAssigned.session",
          foreignField: "_id",
          as: "sessionInfo",
        },
      },
      {
        $lookup: {
          from: "streams",
          localField: "classesAssigned.stream",
          foreignField: "_id",
          as: "streamInfo",
        },
      },
      {
        $lookup: {
          from: "classes",
          localField: "classesAssigned.classId",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      {
        $lookup: {
          from: "sections",
          localField: "classesAssigned.sectionId",
          foreignField: "_id",
          as: "sectionInfo",
        },
      },
      {
        $lookup: {
          from: "subjects",
          localField: "classesAssigned.subjectId",
          foreignField: "_id",
          as: "subjectInfo",
        },
      },

      /* ===== CLEAN RESPONSE ===== */
      {
        $project: {
          firstName: 1,
          lastName: 1,
          employeeId: 1,
          classesAssigned: 1,
          sessionInfo: 1,
          streamInfo: 1,
          classInfo: 1,
          sectionInfo: 1,
          subjectInfo: 1,
        },
      },
    ];

    const result = await Teacher.aggregate(pipeline);

    if (!result.length) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Teacher not found"));
    }

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          result[0],
          "Assigned classes fetched session wise",
        ),
      );
  },
);

export const getAssignedClassesByTeacherSession = asyncHandler(
  async (req, res) => {
    const { teacherId } = req.params;
    const { session } = req.query;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid teacherId"));
    }

    if (!session || !mongoose.Types.ObjectId.isValid(session)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Valid session is required"));
    }

    const pipeline = [
      /* ===== MATCH TEACHER ===== */
      {
        $match: {
          _id: new mongoose.Types.ObjectId(teacherId),
        },
      },

      /* ===== UNWIND ASSIGNED CLASSES ===== */
      {
        $unwind: "$classesAssigned",
      },

      /* ===== FILTER BY SESSION ===== */
      {
        $match: {
          "classesAssigned.session": new mongoose.Types.ObjectId(session),
        },
      },

      /* ===== LOOKUPS ===== */
      {
        $lookup: {
          from: "classes",
          localField: "classesAssigned.classId",
          foreignField: "_id",
          as: "class",
        },
      },
      {
        $lookup: {
          from: "sections",
          localField: "classesAssigned.sectionId",
          foreignField: "_id",
          as: "section",
        },
      },
      {
        $lookup: {
          from: "subjects",
          localField: "classesAssigned.subjectId",
          foreignField: "_id",
          as: "subject",
        },
      },
      {
        $lookup: {
          from: "streams",
          localField: "classesAssigned.stream",
          foreignField: "_id",
          as: "stream",
        },
      },

      /* ===== EMBED LOOKUP DATA INSIDE OBJECT ===== */
      {
        $addFields: {
          "classesAssigned.classId": {
            $cond: [
              { $gt: [{ $size: "$class" }, 0] },
              { $arrayElemAt: ["$class", 0] },
              null,
            ],
          },
          "classesAssigned.sectionId": {
            $cond: [
              { $gt: [{ $size: "$section" }, 0] },
              { $arrayElemAt: ["$section", 0] },
              null,
            ],
          },
          "classesAssigned.subjectId": {
            $cond: [
              { $gt: [{ $size: "$subject" }, 0] },
              { $arrayElemAt: ["$subject", 0] },
              null,
            ],
          },
          "classesAssigned.stream": {
            $cond: [
              { $gt: [{ $size: "$stream" }, 0] },
              { $arrayElemAt: ["$stream", 0] },
              null,
            ],
          },
        },
      },

      /* ===== REMOVE TEMP FIELDS ===== */
      {
        $project: {
          class: 0,
          section: 0,
          subject: 0,
          stream: 0,
        },
      },

      /* ===== GROUP BACK TO ARRAY ===== */
      {
        $group: {
          _id: "$_id",
          firstName: { $first: "$firstName" },
          lastName: { $first: "$lastName" },
          employeeId: { $first: "$employeeId" },
          classesAssigned: { $push: "$classesAssigned" },
        },
      },
    ];

    const result = await Teacher.aggregate(pipeline);

    if (!result.length) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Teacher not found"));
    }

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          result[0],
          "Assigned classes fetched session wise",
        ),
      );
  },
);

export const updateAssignedClass = asyncHandler(async (req, res) => {
  const { assignId } = req.params;
  const updateData = req.body;

  const teacher = await Teacher.findOne({
    "classesAssigned._id": assignId,
  });

  if (!teacher)
    return res
      .status(404)
      .json(new apiResponse(404, null, "Assignment not found"));

  const cls = teacher.classesAssigned.id(assignId);

  Object.assign(cls, updateData);

  await teacher.save();

  res.status(200).json(new apiResponse(200, cls, "Assigned class updated"));
});

export const deleteAssignedClass = asyncHandler(async (req, res) => {
  const { assignId } = req.params;

  const teacher = await Teacher.findOne({
    "classesAssigned._id": assignId,
  });

  if (!teacher)
    return res
      .status(404)
      .json(new apiResponse(404, null, "Assignment not found"));

  teacher.classesAssigned = teacher.classesAssigned.filter(
    (c) => c._id.toString() !== assignId,
  );

  await teacher.save();

  res.status(200).json(new apiResponse(200, null, "Assigned class removed"));
});

/* ================= GET ALL TEACHERS ================= */


const getAllTeachers = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      classId,
      sectionId,
      session,
      stream,
      subjectId,
      isClassTeacher,
      dob,
      gender,
      status,
      sortBy = "recent",
    } = req.query;

    /* ================= MATCH ================= */
    const matchStage = {};
    if (status) matchStage.status = status;
    if (gender) matchStage.gender = gender;



    const pipeline = [{ $match: matchStage }];


    if (dob) {
      const input = new Date(dob); // yyyy-mm-dd

      const start = new Date(input);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(input);
      end.setUTCHours(23, 59, 59, 999);

      pipeline.push({
        $match: {
          dob: { $gte: start, $lte: end }
        }
      });
    }


    /* ================= SEARCH ================= */
    if (search) {
      const regex = new RegExp(search.trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { firstName: { $regex: regex } },
            { lastName: { $regex: regex } },
            { phone: { $regex: regex } },
            { employeeId: { $regex: regex } },
            { gender: { $regex: regex } },
            { category: { $regex: regex } },
            { religion: { $regex: regex } },
            { caste: { $regex: regex } },
            { email: { $regex: regex } },
            { department: { $regex: regex } },
            { designation: { $regex: regex } },
          ],
        },
      });
    }

    /* ================= SORT ================= */
    pipeline.push({
      $sort:
        sortBy === "recent"
          ? { createdAt: -1, _id: -1 }
          : { createdAt: 1, _id: 1 },
    });

    /* ================= LOOKUPS ================= */
    pipeline.push(
      // user
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

      // sessions
      {
        $lookup: {
          from: "sessions",
          localField: "classesAssigned.session",
          foreignField: "_id",
          as: "sessionsInfo",
        },
      },

      // streams
      {
        $lookup: {
          from: "streams",
          localField: "classesAssigned.stream",
          foreignField: "_id",
          as: "streamsInfo",
        },
      },

      // classes
      {
        $lookup: {
          from: "classes",
          localField: "classesAssigned.classId",
          foreignField: "_id",
          as: "classesInfo",
        },
      },

      // sections
      {
        $lookup: {
          from: "sections",
          localField: "classesAssigned.sectionId",
          foreignField: "_id",
          as: "sectionsInfo",
        },
      },

      // subjects
      {
        $lookup: {
          from: "subjects",
          localField: "classesAssigned.subjectId",
          foreignField: "_id",
          as: "subjectsInfo",
        },
      },
    );

    /* ================= FILTER SESSION & OTHER CLASS FIELDS ================= */
    pipeline.push({
      $addFields: {
        classesAssigned: {
          $filter: {
            input: "$classesAssigned",
            as: "cls",
            cond: {
              $and: [
                session
                  ? {
                    $eq: [
                      "$$cls.session",
                      new mongoose.Types.ObjectId(session),
                    ],
                  }
                  : true, // ⚠️ Changed from {} to true
                classId
                  ? {
                    $eq: [
                      "$$cls.classId",
                      new mongoose.Types.ObjectId(classId),
                    ],
                  }
                  : true, // ⚠️ Changed from {} to true
                sectionId
                  ? {
                    $eq: [
                      "$$cls.sectionId",
                      new mongoose.Types.ObjectId(sectionId),
                    ],
                  }
                  : true, // ⚠️ Changed from {} to true
                stream
                  ? {
                    $eq: [
                      "$$cls.stream",
                      new mongoose.Types.ObjectId(stream),
                    ],
                  }
                  : true, // ⚠️ Changed from {} to true
                subjectId
                  ? {
                    $eq: [
                      "$$cls.subjectId",
                      new mongoose.Types.ObjectId(subjectId),
                    ],
                  }
                  : true, // ⚠️ Changed from {} to true
                isClassTeacher !== undefined
                  ? { $eq: ["$$cls.isClassTeacher", isClassTeacher === "true"] }
                  : true, // ⚠️ Changed from {} to true
              ],
            },
          },
        },
      },
    });

    // Check if any class filter is applied
    const hasClassFilters =
      session ||
      classId ||
      sectionId ||
      stream ||
      subjectId ||
      isClassTeacher !== undefined;

    if (hasClassFilters) {
      pipeline.push({
        $match: {
          classesAssigned: { $ne: [] }, // Only keep teachers with at least one matching class
        },
      });
    }

    /* ================= POPULATE CLASS DETAILS (INCLUDING SESSION) ================= */
    pipeline.push({
      $addFields: {
        classesAssigned: {
          $map: {
            input: "$classesAssigned",
            as: "cls",
            in: {
              session: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$sessionsInfo",
                      as: "sess",
                      cond: { $eq: ["$$sess._id", "$$cls.session"] },
                    },
                  },
                  0,
                ],
              },
              stream: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$streamsInfo",
                      as: "st",
                      cond: { $eq: ["$$st._id", "$$cls.stream"] },
                    },
                  },
                  0,
                ],
              },
              class: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$classesInfo",
                      as: "c",
                      cond: { $eq: ["$$c._id", "$$cls.classId"] },
                    },
                  },
                  0,
                ],
              },
              section: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$sectionsInfo",
                      as: "s",
                      cond: { $eq: ["$$s._id", "$$cls.sectionId"] },
                    },
                  },
                  0,
                ],
              },
              subject: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$subjectsInfo",
                      as: "sub",
                      cond: { $eq: ["$$sub._id", "$$cls.subjectId"] },
                    },
                  },
                  0,
                ],
              },
              isClassTeacher: "$$cls.isClassTeacher",
            },
          },
        },
      },
    });

    /* ================= CLEANUP ================= */
    pipeline.push({
      $project: {
        sessionsInfo: 0,
        streamsInfo: 0,
        classesInfo: 0,
        sectionsInfo: 0,
        subjectsInfo: 0,
        "user.password": 0,
      },
    });

    /* ================= TOTAL COUNT ================= */
    const totalArr = await Teacher.aggregate([
      ...pipeline,
      { $count: "count" },
    ]);
    const total = totalArr[0]?.count || 0;

    /* ================= PAGINATION ================= */
    if (isPagination === "true") {
      pipeline.push(
        { $skip: (Number(page) - 1) * Number(limit) },
        { $limit: Number(limit) },
      );
    }

    const teachers = await Teacher.aggregate(pipeline);

    return res.status(200).json(
      new apiResponse(
        200,
        {
          teachers,
          totalTeachers: total,
          totalPages: Math.ceil(total / Number(limit)),
          currentPage: Number(page),
        },
        "Teachers fetched successfully",
      ),
    );
  } catch (error) {
    return res.status(500).json(new apiResponse(500, null, error.message));
  }
});

/* ================= GET SINGLE TEACHER ================= */
const getTeacherById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Validate teacher ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid teacher ID"));
    }

    // Fetch teacher with populates
    const teacher = await Teacher.findById(id)
      .populate("userId", "name phone role email userId password gender")
      .populate("classesAssigned.classId")
      .populate("classesAssigned.sectionId")
      .populate("classesAssigned.subjectId")
      .populate("documents.documentId");

    // Teacher not found
    if (!teacher) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Teacher not found"));
    }

    // Success response
    return res
      .status(200)
      .json(new apiResponse(200, teacher, "Teacher fetched successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

/* ================= UPDATE TEACHER ================= */
const updateTeacher = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid teacher ID"));
  }
  if (req.body.classesAssigned) {
    if (!Array.isArray(req.body.classesAssigned)) {
      req.body.classesAssigned = [req.body.classesAssigned];
    }

    req.body.classesAssigned.forEach((cls) => {
      if (cls.stream === "") delete cls.stream;
      if (cls.sectionId === "") delete cls.sectionId;
      if (cls.subjectId === "") delete cls.subjectId;
      if (cls.classId === "") delete cls.classId;
    });

    const count = req.body.classesAssigned.filter(
      (c) => c.isClassTeacher === true,
    ).length;

    if (count > 1) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            "Teacher can be class teacher for only one class-section-subject",
          ),
        );
    }
  }
  const updatedTeacher = await Teacher.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true },
  );

  if (!updatedTeacher) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Teacher not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, updatedTeacher, "Teacher updated successfully"));
});

/* ================= DELETE TEACHER ================= */
const deleteTeacher = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid teacher ID"));
  }

  const teacher = await Teacher.findByIdAndDelete(req.params.id);

  if (!teacher) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Teacher not found"));
  }

  await User.findByIdAndDelete(teacher.userId);

  res
    .status(200)
    .json(new apiResponse(200, teacher, "Teacher deleted successfully"));
});

export {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
};
