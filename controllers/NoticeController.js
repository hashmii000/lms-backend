import mongoose from "mongoose";
import Notice from "../models/Notice.model.js";
import User from "../models/User.modal.js"; // Admins
import Teacher from "../models/teacher/Teacher.modal.js";
import StudentEnrolment from "../models/student/StudentEnrolment.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { log } from "console";

/* =========================================================
   🔹 VALIDATE RECIPIENTS BASED ON SENDER ROLE
========================================================= */
const validateRecipients = async (
  senderRole,
  recipients = {},
  senderMeta = {},
) => {
  const validated = { ...recipients };

  switch (senderRole) {
    /* ================= SUPERADMIN ================= */
    case "SuperAdmin":
      // SuperAdmin → All / Specific Admins only
      if (validated.roles && validated.roles.some((r) => r !== "Admin")) {
        throw new Error("SuperAdmin can only send to Admin");
      }

      if (
        validated.specificTeachers?.length ||
        validated.specificStudents?.length ||
        validated.classIds?.length ||
        validated.sectionIds?.length
      ) {
        throw new Error("SuperAdmin can only send to Admin");
      }
      break;

    /* ================= ADMIN ================= */
    case "Admin":
      // Admin → sab allowed (table ke hisaab se)
      // Bas SuperAdmin ko block karna ho to yahan add kar sakte ho
      if (validated.roles?.includes("SuperAdmin")) {
        throw new Error("Admin cannot send to SuperAdmin");
      }
      break;

    /* ================= TEACHER ================= */
    case "Teacher":
      // Allowed → Student, Teacher, Admin
      if (validated.roles) {
        const invalidRoles = validated.roles.filter(
          (r) => !["Student", "Teacher", "Admin"].includes(r),
        );
        if (invalidRoles.length) {
          throw new Error("Teacher cannot send to " + invalidRoles.join(", "));
        }
      }

      // Teacher → All Students
      if (validated.roles?.includes("Student")) {
        if (!validated.classIds?.length) {
          // Agar teacher ke pass classIds nahi hai, all students ko bhejna
          console.log("Teacher sending to all students");
          validated.classIds = undefined; // undefined = all students
        }

        // Strong check (agar classIds provided hai)
        if (
          validated.classIds?.length &&
          senderMeta?.classIds?.length &&
          !validated.classIds.every((id) =>
            senderMeta.classIds.includes(id.toString()),
          )
        ) {
          throw new Error("Teacher can only send to their own classes");
        }
      }

      break;

    /* ================= STUDENT ================= */
    case "Student":
      // Student → Admin (via roles)
      if (validated.roles && validated.roles.some((r) => r !== "Admin")) {
        throw new Error("Student can only send to Admin");
      }

      // Student → Specific Teacher only
      if (
        validated.specificStudents?.length ||
        validated.classIds?.length ||
        validated.sectionIds?.length ||
        validated.specificAdmins?.length
      ) {
        throw new Error("Student can only send to specific Teachers or Admin");
      }

      break;

    default:
      throw new Error("Invalid sender role");
  }

  /* ================= ID VALIDATION ================= */

  if (validated.specificTeachers?.length) {
    const teachers = await Teacher.find({
      _id: { $in: validated.specificTeachers },
    }).select("_id");
    validated.specificTeachers = teachers.map((t) => t._id);
  }

  if (validated.specificStudents?.length) {
    const students = await StudentEnrolment.find({
      _id: { $in: validated.specificStudents },
    }).select("_id");
    validated.specificStudents = students.map((s) => s._id);
  }

  if (validated.specificAdmins?.length) {
    const admins = await User.find({
      _id: { $in: validated.specificAdmins },
    }).select("_id");
    validated.specificAdmins = admins.map((a) => a._id);
  }

  return validated;
};

/* =========================================================
   🔹 CREATE NOTICE
========================================================= */
const createNotice = asyncHandler(async (req, res) => {
  const { title, description, sender, recipients, session } = req.body;

  if (!title?.trim())
    return res.status(400).json(new apiResponse(400, null, "Title required"));

  if (!description?.trim())
    return res
      .status(400)
      .json(new apiResponse(400, null, "Description required"));

  if (!sender?.id || !sender?.role)
    return res
      .status(400)
      .json(new apiResponse(400, null, "Sender info required"));

  if (!session || !mongoose.Types.ObjectId.isValid(session)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Valid session is required"));
  }

  /* ================= SENDER META ================= */
  let senderMeta = {};

  if (sender.role === "Teacher") {
    const teacher = await Teacher.findOne({ userId: sender.id }).select(
      "classIds",
    );
    if (!teacher) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Teacher not found"));
    }

    senderMeta.classIds = Array.isArray(teacher.classIds)
      ? teacher.classIds.map((id) => id.toString())
      : [];

    console.log("SenderMeta.classIds:", senderMeta.classIds);

    console.log("Teacher fetched:", teacher);
  }

  /* ================= VALIDATE RECIPIENTS ================= */
  const validatedRecipients = await validateRecipients(
    sender.role,
    recipients,
    senderMeta,
  );

  /* ================= CREATE NOTICE ================= */
  const notice = await Notice.create({
    title: title.trim(),
    description: description.trim(),
    sender,
    recipients: validatedRecipients,
    session,
  });

  res
    .status(201)
    .json(new apiResponse(201, notice, "Notice created successfully"));
});

const getAllNotices = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    fromDate,
    toDate,
    sortBy = "recent",
    isPagination = "true",
    session,
  } = req.query;

  const userId = req.user._id;
  const userRole = req.user.role;

  const match = {};

  /* ================= SEARCH ================= */
  if (search) {
    const regex = new RegExp(search, "i");
    match.$or = [{ title: regex }, { description: regex }];
  }

  if (fromDate || toDate) {
    match.createdAt = {};

    if (fromDate) {
      match.createdAt.$gte = new Date(fromDate);
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999); // pura din include
      match.createdAt.$lte = endDate;
    }
  }
  if (session && mongoose.Types.ObjectId.isValid(session)) {
    match.session = new mongoose.Types.ObjectId(session);
  }

  /* ================= ACCESS CONTROL ================= */
  const accessConditions = [];

  /* ================= SUPER ADMIN ================= */
  if (userRole === "SuperAdmin") {
    // ❌ no access filter → all notices visible
  } else if (userRole === "Admin") {
    /* ================= ADMIN ================= */
    accessConditions.push(
      { "sender.id": userId }, // sent by admin
      { "recipients.roles": "Admin" },
      { "recipients.specificAdmins": userId },
    );
  } else if (userRole === "Teacher") {
    /* ================= TEACHER ================= */
    const teacher = await Teacher.findOne({ userId }).select(
      "_id classesAssigned",
    );

    if (!teacher) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Teacher profile not found"));
    }

    const classIds = teacher.classesAssigned
      ?.map((c) => c.classId)
      .filter(Boolean);

    const sectionIds = teacher.classesAssigned
      ?.map((c) => c.sectionId)
      .filter(Boolean);

    accessConditions.push(
      { "sender.id": userId }, // sent by teacher
      { "recipients.roles": "Teacher" },
      { "recipients.specificTeachers": teacher._id },
      {
        $and: [
          { "recipients.roles": "Student" },
          { "recipients.classIds": { $in: classIds } },
        ],
      },
    );
  } else if (userRole === "Student") {
    /* ================= STUDENT ================= */
    const enrolments = await StudentEnrolment.find({ userId }).select(
      "_id currentClass currentSection",
    );

    const studentIds = enrolments.map((e) => e._id);
    const classIds = enrolments.map((e) => e.currentClass).filter(Boolean);
    const sectionIds = enrolments.map((e) => e.currentSection).filter(Boolean);

    accessConditions.push(
      { "sender.id": userId }, // sent by student
      { "recipients.roles": "Student" },
      { "recipients.specificStudents": { $in: studentIds } },
      {
        $and: [
          { "recipients.classIds": { $in: classIds } },
          { "recipients.sectionIds": { $in: sectionIds } },
        ],
      },
    );
  }

  if (accessConditions.length) {
    match.$and = match.$and || [];
    match.$and.push({ $or: accessConditions });
  }

  /* ================= AGGREGATION ================= */
  const pipeline = [{ $match: match }];

  pipeline.push({
    $sort: sortBy === "oldest" ? { createdAt: 1 } : { createdAt: -1 },
  });

  const totalArr = await Notice.aggregate([...pipeline, { $count: "count" }]);
  const total = totalArr[0]?.count || 0;

  if (isPagination === "true") {
    pipeline.push(
      { $skip: (page - 1) * Number(limit) },
      { $limit: Number(limit) },
    );
  }

  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "sender.id",
        foreignField: "_id",
        as: "senderUser",
      },
    },
    { $unwind: { path: "$senderUser", preserveNullAndEmptyArrays: true } },
  );

  const notices = await Notice.aggregate(pipeline);

  res.status(200).json(
    new apiResponse(200, {
      notices,
      totalNotices: total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    }),
  );
});

/* =========================================================
   🔹 GET NOTICE BY ID
========================================================= */
const getNoticeById1 = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ================= VALIDATE ID =================
  if (!mongoose.Types.ObjectId.isValid(id))
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Notice ID"));

  // ================= LOGGED-IN USER =================
  const userId = req.user._id;
  const userRole = req.user.role;
  console.log("NOTICE RECIPIENTS:", notice.recipients);
  console.log("USER ROLE:", userRole);
  console.log("USER ID:", userId);

  // ================= FETCH NOTICE =================
  let notice = await Notice.findById(id)
    .populate("sender.id", "name role")
    .populate("recipients.specificTeachers", "name")
    .populate("recipients.specificStudents", "name")
    .populate("recipients.specificAdmins", "name");

  if (!notice)
    return res.status(404).json(new apiResponse(404, null, "Notice not found"));

  // ================= ACCESS CONTROL =================
  let canView = false;

  if (userRole === "SuperAdmin") {
    canView = true; // sab dekh sakta
  }

  if (userRole === "Admin") {
    if (
      notice.recipients.roles?.includes("Admin") ||
      notice.recipients.specificAdmins?.some(
        (a) => a._id.toString() === userId.toString(),
      )
    ) {
      canView = true;
    }
  }

  if (userRole === "Teacher") {
    console.log("TEACHER DOC:", teacher);
    console.log("TEACHER CLASSES:", teacher?.classesAssigned);

    const teacher = await Teacher.findOne({ userId }).select(
      "_id classesAssigned",
    );

    if (!teacher) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Teacher profile not found"));
    }

    const teacherClassIds = teacher.classesAssigned
      ?.map((c) => c.classId?.toString())
      .filter(Boolean);

    // 1️⃣ Direct teacher notice
    if (
      notice.recipients.roles?.includes("Teacher") ||
      notice.recipients.specificTeachers?.some(
        (t) => t._id.toString() === teacher._id.toString(),
      )
    ) {
      canView = true;
    }

    // 2️⃣ Student notice for teacher's class
    if (
      notice.recipients.roles?.includes("Student") &&
      notice.recipients.classIds?.some((cid) =>
        teacherClassIds.includes(cid.toString()),
      )
    ) {
      canView = true;
    }
  }

  if (userRole === "Student") {
    const enrolments = await StudentEnrolment.find({ userId }).select(
      "_id currentClass currentSection",
    );

    const studentIds = enrolments.map((e) => e._id.toString());
    const classIds = enrolments.map((e) => e.currentClass?.toString());
    const sectionIds = enrolments.map((e) => e.currentSection?.toString());

    if (
      notice.recipients.roles?.includes("Student") ||
      notice.recipients.specificStudents?.some((s) =>
        studentIds.includes(s._id.toString()),
      ) ||
      (notice.recipients.classIds?.some((cid) =>
        classIds.includes(cid.toString()),
      ) &&
        notice.recipients.sectionIds?.some((sid) =>
          sectionIds.includes(sid.toString()),
        ))
    ) {
      canView = true;
    }
  }

  // if (userRole === "Student") {
  //   if (
  //     notice.recipients.roles?.includes("Student") ||
  //     notice.recipients.specificStudents?.some(
  //       (s) => s._id.toString() === userId.toString(),
  //     )
  //   ) {
  //     canView = true;
  //   }
  // }

  if (!canView)
    return res
      .status(403)
      .json(
        new apiResponse(
          403,
          null,
          "You are not authorized to view this notice",
        ),
      );

  // ================= RESPONSE =================
  res.status(200).json(new apiResponse(200, notice));
});

const getNoticeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Notice ID"));
  }

  const userId = req.user._id;
  const userRole = req.user.role;

  // ✅ STEP 1: FETCH NOTICE FIRST
  const notice = await Notice.findById(id)
    .populate("recipients.specificTeachers", "name")
    .populate("recipients.specificStudents", "name")
    .populate("recipients.specificAdmins", "name");

  if (!notice) {
    return res.status(404).json(new apiResponse(404, null, "Notice not found"));
  }

  // ✅ STEP 2: NOW USE notice SAFELY
  let canView = false;

  /* ================= SUPER ADMIN ================= */
  if (userRole === "SuperAdmin") {
    canView = true;
  }

  /* ================= ADMIN ================= */
  if (userRole === "Admin") {
    if (
      notice.recipients.roles?.includes("Admin") ||
      notice.recipients.specificAdmins?.some(
        (a) => a._id.toString() === userId.toString(),
      )
    ) {
      canView = true;
    }
  }

  /* ================= TEACHER ================= */
  if (userRole === "Teacher") {
    const teacher = await Teacher.findOne({ userId }).select(
      "_id classesAssigned",
    );

    const teacherClassIds = teacher?.classesAssigned
      ?.map((c) => c.classId?.toString())
      .filter(Boolean);

    if (
      notice.recipients.roles?.includes("Teacher") ||
      notice.recipients.specificTeachers?.some(
        (t) => t._id.toString() === teacher?._id.toString(),
      ) ||
      (notice.recipients.roles?.includes("Student") &&
        notice.recipients.classIds?.some((cid) =>
          teacherClassIds?.includes(cid.toString()),
        ))
    ) {
      canView = true;
    }
  }

  /* ================= STUDENT ================= */
  if (userRole === "Student") {
    const enrolments = await StudentEnrolment.find({ userId }).select(
      "_id currentClass currentSection",
    );

    const classIds = enrolments.map((e) => e.currentClass?.toString());
    const sectionIds = enrolments.map((e) => e.currentSection?.toString());

    if (
      notice.recipients.roles?.includes("Student") ||
      (notice.recipients.classIds?.some((cid) =>
        classIds.includes(cid.toString()),
      ) &&
        notice.recipients.sectionIds?.some((sid) =>
          sectionIds.includes(sid.toString()),
        ))
    ) {
      canView = true;
    }
  }

  if (!canView) {
    return res
      .status(403)
      .json(
        new apiResponse(
          403,
          null,
          "You are not authorized to view this notice",
        ),
      );
  }

  res.status(200).json(new apiResponse(200, notice));
});

/* =========================================================
   🔹 UPDATE NOTICE
========================================================= */
const updateNotice67 = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Notice ID"));
  }

  const notice = await Notice.findById(id);
  if (!notice) {
    return res.status(404).json(new apiResponse(404, null, "Notice not found"));
  }

  const userId = req.user._id;
  const userRole = req.user.role;

  let canUpdate = false;

  // Sender can update
  if (notice.sender.id.toString() === userId.toString()) {
    canUpdate = true;
  }

  // SuperAdmin can update
  if (userRole === "SuperAdmin") {
    canUpdate = true;
  }

  if (!canUpdate) {
    return res
      .status(403)
      .json(
        new apiResponse(
          403,
          null,
          "You are not authorized to update this notice",
        ),
      );
  }

  /* ================= FIX START ================= */
  let senderMeta = {};

  if (notice.sender.role === "Teacher") {
    const teacher = await Teacher.findOne({
      userId: notice.sender.id,
    }).select("classIds");

    if (!teacher) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Teacher not found"));
    }

    senderMeta.classIds = Array.isArray(teacher.classIds)
      ? teacher.classIds.map((id) => id.toString())
      : [];
  }
  /* ================= FIX END ================= */

  if (req.body.recipients) {
    req.body.recipients = await validateRecipients(
      notice.sender.role,
      req.body.recipients,
      senderMeta, // ✅ REQUIRED
    );
  }

  const updatedNotice = await Notice.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate("sender.id", "name role")
    .populate("recipients.specificTeachers", "name")
    .populate("recipients.specificStudents", "name")
    .populate("recipients.specificAdmins", "name");

  res.status(200).json(new apiResponse(200, updatedNotice, "Notice updated"));
});

const updateNotice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ================= VALIDATE ID =================
  if (!mongoose.Types.ObjectId.isValid(id))
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Notice ID"));

  // ================= FETCH NOTICE =================
  const notice = await Notice.findById(id);
  if (!notice)
    return res.status(404).json(new apiResponse(404, null, "Notice not found"));

  // ================= ACCESS CONTROL =================
  const userId = req.user._id;
  const userRole = req.user.role;

  let canUpdate = false;

  // Only sender can update
  if (notice.sender.id.toString() === userId.toString()) {
    canUpdate = true;
  }

  // OPTIONAL: SuperAdmin can update any notice
  if (userRole === "SuperAdmin") {
    canUpdate = true;
  }

  if (!canUpdate)
    return res
      .status(403)
      .json(
        new apiResponse(
          403,
          null,
          "You are not authorized to update this notice",
        ),
      );

  // ================= VALIDATE RECIPIENTS =================
  if (req.body.recipients) {
    // sender.role se validate karo
    req.body.recipients = await validateRecipients(
      notice.sender.role,
      req.body.recipients,
    );
  }

  // ================= UPDATE NOTICE =================
  const updatedNotice = await Notice.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate("sender.id", "name role")
    .populate("recipients.specificTeachers", "name")
    .populate("recipients.specificStudents", "name")
    .populate("recipients.specificAdmins", "name");

  res.status(200).json(new apiResponse(200, updatedNotice, "Notice updated"));
});

/* =========================================================
   🔹 DELETE NOTICE
========================================================= */
const deleteNotice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ================= VALIDATE ID =================
  if (!mongoose.Types.ObjectId.isValid(id))
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Notice ID"));

  // ================= FETCH NOTICE =================
  const notice = await Notice.findById(id);
  if (!notice)
    return res.status(404).json(new apiResponse(404, null, "Notice not found"));

  // ================= ACCESS CONTROL =================
  const userId = req.user._id;
  const userRole = req.user.role;

  let canDelete = false;

  // Original sender can delete
  if (notice.sender.id.toString() === userId.toString()) {
    canDelete = true;
  }

  // SuperAdmin can delete any notice
  if (userRole === "SuperAdmin") {
    canDelete = true;
  }

  if (!canDelete)
    return res
      .status(403)
      .json(
        new apiResponse(
          403,
          null,
          "You are not authorized to delete this notice",
        ),
      );

  // ================= DELETE NOTICE =================
  await Notice.findByIdAndDelete(id);

  res.status(200).json(new apiResponse(200, notice, "Notice deleted"));
});

/* ========================================================= */
export {
  createNotice,
  getAllNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
};
