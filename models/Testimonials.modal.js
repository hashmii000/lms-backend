import mongoose from "mongoose";

const testimonialsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    discription: {
      type: String,
    },
    rating: {
      type: Number,
    },
    profileImage: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Testimonials", testimonialsSchema);
