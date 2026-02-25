import mongoose from "mongoose";

const StreamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true, // Science, Commerce, Arts
      trim: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model("Stream", StreamSchema);
