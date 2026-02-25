import mongoose from "mongoose";

const FeeStructureSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true, //  mandatory
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

    feeHeadName: {
      type: String,
      required: true,
      trim: true,
    },

    installmentType: {
      type: String,
      enum: ["MONTHLY", "QUARTERLY", "CUSTOM_10"],
      required: true,
    },

    totalInstallments: {
      type: Number,
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    remark: String,

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("FeeStructure", FeeStructureSchema);