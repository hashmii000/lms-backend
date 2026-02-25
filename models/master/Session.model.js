import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema(
  {
    sessionName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("Session", SessionSchema);
