import User from "../models/User.modal.js";
import Session from "../models/master/Session.model.js";
import StudentEnrolment from "../models/student/StudentEnrolment.modal.js";
import Teacher from "../models/teacher/Teacher.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { generateOTP } from "../utils/generateOTP.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { sendWhatsappOTP } from "../utils/sendOTP.js";
import cloudinary from "../config/cloudinary.js";

import mongoose from "mongoose";

const OTP_EXPIRATION_TIME = 5 * 60 * 1000;

const registerOrLogin12 = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Phone number is required"));
  }

  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Phone number must be exactly 10 digits"),
      );
  }

  let user = await User.findOne({ phone });

  const otp = phone === "1111111111" ? "0101" : generateOTP();
  const otpExpiration = new Date(Date.now() + OTP_EXPIRATION_TIME);

  await sendWhatsappOTP(phone, otp);

  if (user) {
    user.otp = otp;
    user.otpExpiration = otpExpiration;
    await user.save();

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          { phone, otp, isNew: user.isNew, _id: user._id },
          "Existing user - OTP sent successfully",
        ),
      );
  }

  const newUser = new User({ phone, otp, otpExpiration, isNew: true });
  await newUser.save();

  return res
    .status(200)
    .json(
      new apiResponse(200, newUser, "New user created - OTP sent successfully"),
    );
});

const registerOrLogin = asyncHandler(async (req, res) => {
  const {
    phone,
    userId,
    password,
    name,
    gender = "Male",
    role = "User",
  } = req.body;

  // 🔹 Basic validation
  if (!phone || !userId || !password) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Phone, userId and password are required"),
      );
  }

  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Phone number must be exactly 10 digits"),
      );
  }

  // 🔹 Find user by userId
  let user = await User.findOne({ userId });

  const otp = phone === "1111111111" ? "0101" : generateOTP();
  const otpExpiration = new Date(Date.now() + OTP_EXPIRATION_TIME);

  await sendWhatsappOTP(phone, otp);

  // 🔹 EXISTING USER
  if (user) {
    // userId + phone safety
    if (user.phone !== phone) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Phone number does not match userId"));
    }

    // password check (plain-text as per your current system)
    if (!user.password || user.password !== password) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid password"));
    }

    user.otp = otp;
    user.otpExpiration = otpExpiration;
    await user.save();

    return res.status(200).json(
      new apiResponse(
        200,
        {
          _id: user._id,
          userId: user.userId,
          phone: user.phone,
          isNew: user.isNew,
          name,
          gender,
          role,
        },
        "Existing user - OTP sent successfully",
      ),
    );
  }

  // 🔹 NEW USER CREATE
  const newUser = await User.create({
    userId,
    phone,
    password,
    otp,
    otpExpiration,
    name,
    gender,
    role,
    isNew: true,
  });

  return res.status(200).json(
    new apiResponse(
      200,
      {
        _id: newUser._id,
        userId: newUser.userId,
        phone: newUser.phone,
        isNew: true,
      },
      "New user created - OTP sent successfully",
    ),
  );
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  const user = await User.findOne({ phone });
  if (!user)
    return res.status(400).json(new apiResponse(400, null, "User not found"));
  if (user.otp !== otp)
    return res.status(400).json(new apiResponse(400, null, "Invalid OTP"));

  const token = user.generateAuthToken();

  res.status(200).json(
    new apiResponse(
      200,
      {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        email: user.email,
        gender: user.gender,
        upgradedId: user.upgradedId,
        driverApplicationStatus: user.driverApplicationStatus, // ⭐ ADD
        isNew: user.isNew,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        authToken: token,
      },
      "OTP verified successfully",
    ),
  );
});

const resendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone)
    return res
      .status(400)
      .json(new apiResponse(400, null, "Phone number is required"));

  const user = await User.findOne({ phone });
  if (!user)
    return res.status(400).json(new apiResponse(400, null, "User not found"));

  const otp = generateOTP();
  const otpExpiration = new Date(Date.now() + OTP_EXPIRATION_TIME);

  await sendWhatsappOTP(phone, otp);

  user.otp = otp;
  user.otpExpiration = otpExpiration;
  await user.save();

  res
    .status(200)
    .json(new apiResponse(200, { phone, otp }, "OTP resent successfully"));
});

const updateUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user)
    return res.status(404).json(new apiResponse(404, null, "User not found"));

  // Update only allowed fields
  Object.keys(req.body).forEach((key) => {
    user[key] = req.body[key];
  });

  // Handle driver intent
  if (req.body.wantsToBeDriver) {
    // Only set to Initiated if current status is None
    if (
      !user.driverApplicationStatus ||
      user.driverApplicationStatus === "None"
    ) {
      user.driverApplicationStatus = "Initiated"; // User wants to become driver
    }
  }

  user.isNew = false;
  await user.save();

  res.status(200).json(new apiResponse(200, user, "User updated successfully"));
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const getData = await User.findById(id);
  if (!getData)
    return res.status(404).json(new apiResponse(404, null, "User not found"));

  await User.findByIdAndDelete(id);
  res.status(200).json(new apiResponse(200, null, "User deleted successfully"));
});

const getAllUsers = asyncHandler(async (req, res) => {
  const {
    isPagination = "true",
    page = 1,
    limit = 10,
    search,
    sortBy = "recent",
    role, // 👈 role filter
  } = req.query;

  const match = {};

  /* ================= ROLE FILTER ================= */
  if (role) {
    match.role = role;
  }

  let pipeline = [{ $match: match }];

  /* ================= SEARCH ================= */
  if (search) {
    const words = search
      .trim()
      .split(/\s+/)
      .map((word) => new RegExp(word, "i"));

    const orConditions = words.flatMap((regex) => [
      { name: { $regex: regex } },
      { phone: { $regex: regex } },
      { email: { $regex: regex } },
    ]);

    pipeline.push({ $match: { $or: orConditions } });
  }

  /* ================= SORT ================= */
  if (sortBy === "recent") {
    pipeline.push({ $sort: { createdAt: -1, _id: -1 } });
  } else if (sortBy === "oldest") {
    pipeline.push({ $sort: { createdAt: 1, _id: 1 } });
  } else {
    pipeline.push({ $sort: { _id: -1 } });
  }

  /* ================= TOTAL COUNT ================= */
  const totalUsersArr = await User.aggregate([
    ...pipeline,
    { $count: "count" },
  ]);
  const total = totalUsersArr[0]?.count || 0;

  /* ================= PAGINATION ================= */
  if (isPagination === "true") {
    pipeline.push(
      { $skip: (page - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
    );
  }

  /* ================= HIDE SENSITIVE FIELDS ================= */
  pipeline.push({
    $project: {
      password: 0,
      otp: 0,
      otpExpiration: 0,
    },
  });

  /* ================= EXECUTE ================= */
  const users = await User.aggregate(pipeline);

  /* ================= RESPONSE ================= */
  res.status(200).json(
    new apiResponse(
      200,
      {
        users,
        totalUsers: total,
        totalPages: isPagination === "true" ? Math.ceil(total / limit) : 1,
        currentPage: isPagination === "true" ? Number(page) : null,
      },
      "Users fetched successfully",
    ),
  );
});

const getProfile12 = async (req, res) => {
  try {
    const userId = req.user._id;

    const data = await User.findById(userId).select(
      "-password -otp -otpExpiration",
    );

    if (!data) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, data, "User profile fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, "Server error"));
  }
};

const getProfile123 = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1️⃣ Base user
    const user = await User.findById(userId).select(
      "-password -otp -otpExpiration",
    );

    if (!user) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    let profileData = null;

    // 2️⃣ Role-based data
    if (user.role === "Student") {
      profileData = await StudentEnrolment.find({ userId }).populate(
        "currentClass currentSection session",
      );
    }

    if (user.role === "Teacher") {
      profileData = await Teacher.findOne({ userId });
    }

    // 3️⃣ Admin / SuperAdmin
    if (["Admin", "SuperAdmin", "Accountant"].includes(user.role)) {
      profileData = null;
    }

    // 4️⃣ Response
    return res.status(200).json(
      new apiResponse(
        200,
        {
          role: user.role,
          user,
          profile: user.role === "Student" ? profileData || [] : profileData,
        },
        "Profile fetched successfully",
      ),
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(new apiResponse(500, null, "Server error"));
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    /* ================= USER ================= */
    const user = await User.findById(userId).select(
      "-password -otp -otpExpiration",
    );

    if (!user) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    let profile = null;
    let history = [];
    let totalSessions = 0;

    /* ================= CURRENT SESSION ================= */
    const currentSession = await Session.findOne({
      isCurrent: true,
      isActive: true,
    });

    if (!currentSession) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Current session not found"));
    }

    /* ================= STUDENT ================= */
    if (user.role === "Student") {
      // 🔹 Current session profile
      profile = await StudentEnrolment.findOne({
        userId,
        session: currentSession._id,
      })
        .populate("currentClass", "name")
        .populate("currentSection", "name")
        .populate("session", "sessionName");
      // 🔹 History (excluding current)
      history = await StudentEnrolment.find({
        userId,
        session: { $ne: currentSession._id },
      })
        .populate("currentClass", "name")
        .populate("currentSection", "name")
        .populate("session", "sessionName")
        .sort({ admissionDate: -1, createdAt: -1 });

      totalSessions = history.length + (profile ? 1 : 0);
    } else if (user.role === "Teacher") {
      /* ================= TEACHER ================= */
      profile = await Teacher.findOne({ userId })
        .populate("userId", "phone email name gender")
        .populate("classesAssigned.classId", "name")
        .populate("classesAssigned.sectionId", "name")
        .populate({
          path: "classesAssigned.stream",
          select: "name",
        });
      history = []; // teacher ke liye session history usually nahi hoti
      totalSessions = profile ? 1 : 0;
    } else if (["Admin", "SuperAdmin", "Accountant"].includes(user.role)) {
      /* ================= ADMIN ================= */
      profile = null;
      history = [];
      totalSessions = 0;
    }

    /* ================= RESPONSE ================= */
    return res.status(200).json(
      new apiResponse(
        200,
        {
          role: user.role,
          user,
          profile, // ✅ only current session
          history, // ✅ old sessions
          currentSession: currentSession.sessionName,
          totalSessions,
        },
        "Profile fetched successfully",
      ),
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(new apiResponse(500, null, "Server error"));
  }
};

const loginWithPassword12 = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Phone number and password are required"),
      );
  }

  try {
    const existingUser = await User.findOne({ phone });

    if (!existingUser) {
      return res.status(400).json(new apiResponse(400, null, "User not found"));
    }

    if (existingUser.activeStatus === false) {
      return res
        .status(403)
        .json(new apiResponse(403, null, "User is blocked and cannot login"));
    }

    // Check if password is set
    if (!existingUser.password) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Password is not set for this user"));
    }

    // 🔹 Compare plain-text passwords directly
    if (existingUser.password !== password) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid password"));
    }

    // Generate a JWT token for login
    const token = existingUser.generateAuthToken();

    const userData = {
      _id: existingUser._id,
      phone: existingUser.phone,
      role: existingUser.role,
      name: existingUser.name,
      email: existingUser.email,
      gender: existingUser.gender,
      isNew: existingUser.isNew,
      createdAt: existingUser.createdAt,
      updatedAt: existingUser.updatedAt,
      authToken: token,
    };

    res.status(200).json(new apiResponse(200, userData, "Login successful"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const loginWithPassword = asyncHandler(async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "UserId and password are required"));
  }

  try {
    // 🔹 Find user by userId
    const existingUser = await User.findOne({ userId });

    if (!existingUser) {
      return res.status(400).json(new apiResponse(400, null, "User not found"));
    }

    if (existingUser.activeStatus === false) {
      return res
        .status(403)
        .json(new apiResponse(403, null, "User is blocked and cannot login"));
    }

    // 🔹 Check password exists
    if (!existingUser.password) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Password is not set for this user"));
    }

    // 🔹 Plain-text password comparison (as per your logic)
    if (existingUser.password !== password) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid password"));
    }

    // 🔹 Generate JWT
    const token = existingUser.generateAuthToken();

    const userData = {
      _id: existingUser._id,
      userId: existingUser.userId,
      phone: existingUser.phone,
      role: existingUser.role,
      name: existingUser.name,
      email: existingUser.email,
      gender: existingUser.gender,
      isNew: existingUser.isNew,
      createdAt: existingUser.createdAt,
      updatedAt: existingUser.updatedAt,
      authToken: token,
    };

    return res
      .status(200)
      .json(new apiResponse(200, userData, "Login successful"));
  } catch (error) {
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const createPassword12 = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password)
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Phone number and password are required"),
      );

  const user = await User.findOne({ phone });
  if (!user)
    return res.status(400).json(new apiResponse(400, null, "User not found"));
  if (user.password)
    return res
      .status(400)
      .json(new apiResponse(400, null, "Password already set"));

  user.password = password;
  await user.save();

  res
    .status(200)
    .json(new apiResponse(200, null, "Password created successfully"));
});

const createPassword = asyncHandler(async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "UserId and password are required"));
  }

  // 🔹 Find user by userId
  const user = await User.findOne({ userId });

  if (!user) {
    return res.status(400).json(new apiResponse(400, null, "User not found"));
  }

  // 🔹 Prevent overwrite
  if (user.password) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Password already set"));
  }

  // 🔹 Save password (plain text as per your current logic)
  user.password = password;
  await user.save();

  return res
    .status(200)
    .json(new apiResponse(200, null, "Password created successfully"));
});

const resetPassword12 = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password)
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Phone number and password are required"),
      );

  const user = await User.findOne({ phone });
  if (!user)
    return res.status(400).json(new apiResponse(400, null, "User not found"));

  user.password = password;
  await user.save();

  res
    .status(200)
    .json(new apiResponse(200, null, "Password reset successfully"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "UserId and password are required"));
  }

  // 🔹 Find user by userId
  const user = await User.findOne({ userId });

  if (!user) {
    return res.status(400).json(new apiResponse(400, null, "User not found"));
  }

  // 🔹 Reset password
  user.password = password;
  await user.save();

  return res
    .status(200)
    .json(new apiResponse(200, null, "Password reset successfully"));
});

const updatePassword12 = asyncHandler(async (req, res) => {
  const { phone, oldPassword, newPassword } = req.body;

  if (!phone || !oldPassword || !newPassword)
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          "Phone number, old password, and new password are required",
        ),
      );

  const user = await User.findOne({ phone });
  if (!user)
    return res.status(400).json(new apiResponse(400, null, "User not found"));

  const isOldPasswordCorrect = await user.matchPassword(oldPassword);
  if (!isOldPasswordCorrect)
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid old password"));

  user.password = newPassword;
  await user.save();

  res
    .status(200)
    .json(new apiResponse(200, null, "Password updated successfully"));
});

const updatePassword = asyncHandler(async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;

  if (!userId || !oldPassword || !newPassword) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          "UserId, old password, and new password are required",
        ),
      );
  }

  // 🔹 Find user by userId
  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(400).json(new apiResponse(400, null, "User not found"));
  }

  // 🔹 Check old password (plain-text)
  if (user.password !== oldPassword) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid old password"));
  }

  // 🔹 Update password
  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new apiResponse(200, null, "Password updated successfully"));
});

const updateUserRoll123 = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!userId || !role)
    return res
      .status(400)
      .json(new apiResponse(400, null, "User ID and role are required"));

  if (
    !["Student", "Admin", "SuperAdmin", "Teacher", "Accountant"].includes(role)
  )
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid role value"));

  const user = await User.findById(userId);
  if (!user)
    return res.status(404).json(new apiResponse(404, null, "User not found"));

  user.role = role;
  await user.save();

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        { userId: user._id, role: user.role },
        "Role updated successfully",
      ),
    );
});

//
const updateUserRoll = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  let { role } = req.body;
  console.log("ROLE FROM REQUEST 👉", role, typeof role);
  if (!userId || !role) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "User ID and role are required"));
  }

  // 🔹 Normalize role
  role = role.trim();

  const ALLOWED_ROLES = [
    "Student",
    "Admin",
    "SuperAdmin",
    "Teacher",
    "Accountant",
  ];

  if (!ALLOWED_ROLES.includes(role)) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          { receivedRole: role, allowedRoles: ALLOWED_ROLES },
          "Invalid role value",
        ),
      );
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json(new apiResponse(404, null, "User not found"));
  }

  user.role = role;
  await user.save();

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        { userId: user._id, role: user.role },
        "Role updated successfully",
      ),
    );
});
const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid user id"));
  }

  const user = await User.findById(userId).select("-password");
  if (!user) {
    return res.status(404).json(new apiResponse(404, null, "User not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, user, "User details fetched successfully"));
});

// Bonus: Get user rides with pagination
const getUserRides = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const user = await User.findById(userId);
  if (!user)
    return res.status(404).json(new apiResponse(404, null, "User not found"));

  const skip = (page - 1) * limit;

  const rides = await User.findById(userId)
    .populate({
      path: "rides",
      options: {
        sort: { createdAt: -1 },
        skip: parseInt(skip),
        limit: parseInt(limit),
      },
    })
    .select("rides");

  const totalRides = user.rides.length;

  res.status(200).json(
    new apiResponse(
      200,
      {
        rides: rides.rides,
        totalRides,
        totalPages: Math.ceil(totalRides / limit),
        currentPage: Number(page),
      },
      "User rides fetched successfully",
    ),
  );
});

export {
  registerOrLogin,
  verifyOtp,
  resendOtp,
  updateUserById,
  getAllUsers,
  getProfile,
  loginWithPassword,
  createPassword,
  updateUserRoll,
  updatePassword,
  resetPassword,
  deleteUser,
  getUserById,
  getUserRides,
};
