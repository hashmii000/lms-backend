import FeeStructure from "../models/master/FeeStructure.model.js";
import AdditionalFee from "../models/master/AdditionalFee.model.js";
import StudentPayment from "../models/master/StudentPayment.model.js";

/* =====================================================
   CALCULATE STUDENT PAYABLE SUMMARY (SESSION-WISE)
   ===================================================== */
const calculateStudentPayableSummary = async ({
  sessionId,
  studentId,
  classId,
  streamId,
}) => {
  /* ================= BASE FEES (FEE STRUCTURE) ================= */
  const feeStructures = await FeeStructure.find({
    sessionId,
    classId,
    streamId: streamId || null,
    isActive: true,
  });

  let totalBaseFees = 0;
  feeStructures.forEach(fs => {
    totalBaseFees += Number(fs.totalAmount || 0);
  });

  /* ================= ADDITIONAL FEES ================= */
  const additionalFees = await AdditionalFee.find({
    sessionId,
    isActive: true,
    $or: [
      { classId: null, streamId: null },                 // global
      { classId, streamId: null },                       // class-wise
      { classId, streamId },                             // class + stream
    ],
  });

  let totalAdditionalFees = 0;
  additionalFees.forEach(fee => {
    totalAdditionalFees += Number(fee.amount || 0);
  });

  /* ================= TOTAL SESSION FEES ================= */
  const totalSessionFees = totalBaseFees + totalAdditionalFees;

  /* ================= TOTAL PAID BY STUDENT ================= */
  const payments = await StudentPayment.find({
    studentId,
    sessionId,
    paymentStatus: "SUCCESS",
  });
  
  let totalPaid = 0;
  
  payments.forEach(p => {
    totalPaid += Number(p.amountPaid || 0);
  });

  /* ================= REMAINING PAYABLE ================= */
  const remainingPayable = Math.max(totalSessionFees - totalPaid, 0);

  return {
    totalBaseFees,
    totalAdditionalFees,
    totalSessionFees,
    totalPaid,
    remainingPayable,
  };
};

export { calculateStudentPayableSummary };