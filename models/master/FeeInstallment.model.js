import mongoose from "mongoose";

const FeeInstallmentSchema = new mongoose.Schema(
  {
    feeStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeStructure",
      required: true,
    },

    installmentNo: {
      type: Number,
      required: true,
    },

    period: {
      type: String, // APRIL, MAY-JUNE, APR-JUN etc
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    remark: String,

    status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

export default mongoose.model("FeeInstallment", FeeInstallmentSchema);