import mongoose from "mongoose";

const StudentPaymentSchema = new mongoose.Schema(
  {
    /* ================= WHO COLLECTED ================= */
    clerkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null for online payments
    },

    /* ================= CONTEXT ================= */
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    streamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stream",
      default: null,
    },

    /* ================= AMOUNT ================= */
    amountPaid: {
      type: Number,
      required: true,
    },

    /* ================= PAYMENT INFO ================= */
    paymentMode: {
      type: String,
      enum: ["CASH", "ONLINE", "CHEQUE", "UPI"],
      required: true,
    },

    paymentType: {
      type: String,
      enum: ["OFFLINE", "ONLINE"],
      default: "OFFLINE",
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "SUCCESS", // OFFLINE payments are instant
    },

    /* ================= GATEWAY (RAZORPAY) ================= */
    gateway: {
      type: String, // "RAZORPAY"
    },

    gatewayOrderId: String,
    gatewayPaymentId: String,
    gatewaySignature: String,

    /* ================= META ================= */
    referenceNo: String, // cheque / manual ref

    receiptNo: {
      type: String,
      unique: true,
    },

    remarks: String,

    paymentDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("StudentPayment", StudentPaymentSchema);