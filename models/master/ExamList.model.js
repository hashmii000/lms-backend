import mongoose from "mongoose";

const ExamListSchema = new mongoose.Schema(
  {
    examMasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamMaster",
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    fromDate: {
      type: Date,
      required: true,
    },

    toDate: {
      type: Date,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, 
  },
);

// Export the model
export default mongoose.model("ExamList", ExamListSchema);
