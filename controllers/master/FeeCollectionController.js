import StudentPayment from "../../models/master/StudentPayment.model.js";
import StudentPaymentAllocation from "../../models/master/StudentPaymentAllocation.model.js";
import FeeInstallment from "../../models/master/FeeInstallment.model.js";
import AdditionalFee from "../../models/master/AdditionalFee.model.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import FeeStructure from "../../models/master/FeeStructure.model.js";
import { calculateStudentPayableSummary } from "../../utils/feeHelper.js";



/* ================= COLLECT FEE  ================= 
const collectStudentFee = asyncHandler(async (req, res) => {
  const {
    sessionId,
    studentId,
    classId,
    streamId,
    amountPaid,
    paymentMode,
    referenceNo,
    remarks,
  } = req.body;

  if (!sessionId || !studentId || !classId || !amountPaid || !paymentMode) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Required fields missing"));
  }

  // Create payment master
  const payment = await StudentPayment.create({
    sessionId,
    studentId,
    classId,
    streamId: streamId || null,
    amountPaid,
    paymentMode,
    referenceNo,
    receiptNo: `RCPT-${Date.now()}`,
    remarks,
  });

  let remaining = amountPaid;

  // FETCH TUITION INSTALLMENTS 

// Get fee structures
const feeStructures = await FeeStructure.find({
  sessionId,
  classId,
  streamId: streamId || null,
});

if (!feeStructures.length) {
  console.log("No fee structures found for this class/session");
}

const feeStructureIds = feeStructures.map(fs => fs._id);

// Get installments using feeStructureId
const tuitionInstallments = await FeeInstallment.find({
  feeStructureId: { $in: feeStructureIds },
}).sort({ dueDate: 1 });

  // FETCH ADDITIONAL FEES 

  const additionalFees = await AdditionalFee.find({
    sessionId,
    $or: [
      { classId: null },
      { classId, streamId: null },
      { classId, streamId },
    ],
  }).sort({ dueDate: 1 });

  // FETCH EXISTING ALLOCATIONS  

  const existingAllocations = await StudentPaymentAllocation.find({
    feeType: "TUITION",
    referenceId: { $in: tuitionInstallments.map(i => i._id) },
  });

  const allocationMap = {};
  existingAllocations.forEach(a => {
    const key = a.referenceId.toString();
    allocationMap[key] = (allocationMap[key] || 0) + a.allocatedAmount;
  });

  //  APPLY PAYMENT to TUITION FIRST 

  for (const inst of tuitionInstallments) {
    if (remaining <= 0) break;

    const alreadyPaid = allocationMap[inst._id.toString()] || 0;
    const due = inst.amount - alreadyPaid;

    if (due <= 0) continue;

    const apply = Math.min(due, remaining);

    await StudentPaymentAllocation.create({
      paymentId: payment._id,
      feeType: "TUITION",
      referenceId: inst._id,
      allocatedAmount: apply,
    });

    remaining -= apply;
  }

  // APPLY PAYMENT to ADDITIONAL FEES

  for (const fee of additionalFees) {
    if (remaining <= 0) break;

    const paid = await StudentPaymentAllocation.aggregate([
      {
        $match: {
          feeType: "ADDITIONAL",
          referenceId: fee._id,
        },
      },
      {
        $group: {
          _id: "$referenceId",
          total: { $sum: "$allocatedAmount" },
        },
      },
    ]);

    const alreadyPaid = paid[0]?.total || 0;
    const due = fee.amount - alreadyPaid;

    if (due <= 0) continue;

    const apply = Math.min(due, remaining);

    await StudentPaymentAllocation.create({
      paymentId: payment._id,
      feeType: "ADDITIONAL",
      referenceId: fee._id,
      allocatedAmount: apply,
    });

    remaining -= apply;
  }

  res.status(200).json(
    new apiResponse(
      200,
      payment,
      "Fee collected and allocated successfully"
    )
  );
});*/



/* ================= COLLECT FEE ================= */
const collectStudentFee = asyncHandler(async (req, res) => {
  const {
    clerkId,
    sessionId,
    studentId,
    classId,
    streamId,
    amountPaid,
    paymentMode,
    referenceNo,
    remarks,
  } = req.body;

  if (
    !sessionId ||
    !studentId ||
    !classId ||
    !amountPaid ||
    !paymentMode
  ) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Required fields missing"));
  }

  /* =====================================================
     🔹 CHECK TOTAL PAYABLE (SESSION-WISE)
     ===================================================== */
  const summary = await calculateStudentPayableSummary({
    sessionId,
    studentId,
    classId,
    streamId,
  });

  if (amountPaid > summary.remainingPayable) {
    return res.status(400).json(
      new apiResponse(
        400,
        summary,
        "Payment exceeds total payable fees for this session"
      )
    );
  }

  /* =====================================================
     1️⃣ CREATE PAYMENT MASTER
     ===================================================== */
  const payment = await StudentPayment.create({
    clerkId,
    sessionId,
    studentId,
    classId,
    streamId: streamId || null,
    amountPaid,
    paymentMode,
    referenceNo,
    receiptNo: `RCPT-${Date.now()}`,
    remarks,
    paymentStatus: "SUCCESS",
  });

  let remaining = Number(amountPaid);

  /* =====================================================
     2️⃣ FETCH PREVIOUS SUCCESS PAYMENTS (EXCLUDE CURRENT)
     ===================================================== */
  const studentPaymentIds = await StudentPayment.find({
    studentId,
    sessionId,
    paymentStatus: "SUCCESS",
    _id: { $ne: payment._id },
  }).distinct("_id");

  /* =====================================================
     3️⃣ FETCH FEE STRUCTURES → TUITION INSTALLMENTS
     ===================================================== */
  const feeStructures = await FeeStructure.find({
    sessionId,
    classId,
    streamId: streamId || null,
  });

  const feeStructureIds = feeStructures.map(fs => fs._id);

  const tuitionInstallments = await FeeInstallment.find({
    feeStructureId: { $in: feeStructureIds },
  });

  /* =====================================================
     4️⃣ FETCH ADDITIONAL FEES
     ===================================================== */
  const additionalFees = await AdditionalFee.find({
    sessionId,
    $or: [
      { classId: null },
      { classId, streamId: null },
      { classId, streamId },
    ],
  });

  /* =====================================================
     5️⃣ BUILD PAID MAP (TUITION)
     ===================================================== */
  const tuitionAllocations = await StudentPaymentAllocation.find({
    paymentId: { $in: studentPaymentIds },
    feeType: "TUITION",
    referenceId: { $in: tuitionInstallments.map(i => i._id) },
  });

  const tuitionPaidMap = {};
  tuitionAllocations.forEach(a => {
    tuitionPaidMap[a.referenceId.toString()] =
      (tuitionPaidMap[a.referenceId.toString()] || 0) + a.allocatedAmount;
  });

  /* =====================================================
     6️⃣ BUILD A UNIFIED PAYABLE TIMELINE
     ===================================================== */
  const payableItems = [];

  // Tuition items
  tuitionInstallments.forEach(inst => {
    const paid = tuitionPaidMap[inst._id.toString()] || 0;
    const due = inst.amount - paid;

    if (due > 0) {
      payableItems.push({
        feeType: "TUITION",
        referenceId: inst._id,
        dueDate: inst.dueDate,
        dueAmount: due,
      });
    }
  });

  // Additional fee items
  for (const fee of additionalFees) {
    const paidAgg = await StudentPaymentAllocation.aggregate([
      {
        $match: {
          paymentId: { $in: studentPaymentIds },
          feeType: "ADDITIONAL",
          referenceId: fee._id,
        },
      },
      {
        $group: {
          _id: "$referenceId",
          total: { $sum: "$allocatedAmount" },
        },
      },
    ]);

    const paid = paidAgg[0]?.total || 0;
    const due = fee.amount - paid;

    if (due > 0) {
      payableItems.push({
        feeType: "ADDITIONAL",
        referenceId: fee._id,
        dueDate: fee.dueDate,
        dueAmount: due,
      });
    }
  }

  /* =====================================================
     7️⃣ SORT BY DUE DATE → TUITION FIRST IN SAME MONTH
     ===================================================== */
  payableItems.sort((a, b) => {
    const dateDiff = new Date(a.dueDate) - new Date(b.dueDate);
    if (dateDiff !== 0) return dateDiff;

    // Same due date → tuition first
    if (a.feeType === b.feeType) return 0;
    return a.feeType === "TUITION" ? -1 : 1;
  });

  /* =====================================================
     8️⃣ APPLY PAYMENT SEQUENTIALLY
     ===================================================== */
  for (const item of payableItems) {
    if (remaining <= 0) break;

    const apply = Math.min(item.dueAmount, remaining);

    await StudentPaymentAllocation.create({
      paymentId: payment._id,
      feeType: item.feeType,
      referenceId: item.referenceId,
      allocatedAmount: apply,
    });

    remaining -= apply;
  }

  /* =====================================================
     9️⃣ RESPONSE
     ===================================================== */
  res.status(200).json(
    new apiResponse(
      200,
      payment,
      "Fee collected and allocated successfully"
    )
  );
});

export { collectStudentFee };