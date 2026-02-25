import mongoose from "mongoose";

const StudentPaymentAllocationSchema = new mongoose.Schema(
  {
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentPayment",
      required: true,
    },

    feeType: {
      type: String,
      enum: ["TUITION", "ADDITIONAL"],
      required: true,
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      // feeInstallmentId OR additionalFeeId
    },

    allocatedAmount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "StudentPaymentAllocation",
  StudentPaymentAllocationSchema
);