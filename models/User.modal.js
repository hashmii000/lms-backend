import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const UserSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    otp: String,
    otpExpiration: Date,

    isNew: {
      type: Boolean,
      default: true,
      required: true,
    },
    name: String,
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },


    role: {
      type: String,
      enum: ["User", "Student", "Admin", "SuperAdmin", "Teacher", "Accountant"],
      default: "User",
      required: true,
    },

    dob: Date,
    age: Number,

    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    profilePic: String,
    address: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
    },
    fcmToken: {
      type: String,
    },
  },
  { timestamps: true }
);





UserSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { userId: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
};

export default mongoose.model("User", UserSchema);
