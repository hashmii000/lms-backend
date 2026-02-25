import mongoose from "mongoose";

const servicesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Services", servicesSchema);
