import Razorpay from "razorpay";
import crypto from "crypto";
import StudentPayment from "../../models/master/StudentPayment.model.js";
import FeeStructure from "../../models/master/FeeStructure.model.js";
import FeeInstallment from "../../models/master/FeeInstallment.model.js";
import AdditionalFee from "../../models/master/AdditionalFee.model.js";
import StudentPaymentAllocation from "../../models/master/StudentPaymentAllocation.model.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import { calculateStudentPayableSummary } from "../../utils/feeHelper.js";


/* ================= RAZORPAY INSTANCE ================= */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ================= CREATE ONLINE PAYMENT ================= */
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { sessionId, studentId, classId, streamId, amount } = req.body;

  if (!sessionId || !studentId || !classId || !amount) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Required fields missing"));
  }
  /* ================= CHECK TOTAL DUE ================= */
  const summary = await calculateStudentPayableSummary({
    sessionId,
    studentId,
    classId,
    streamId,
  });
  
  if (amount > summary.remainingPayable) {
    return res.status(400).json(
      new apiResponse(
        400,
        summary,
        "Payment exceeds total payable fees for this session"
      )
    );
  }
  /* ================= CREATE PENDING PAYMENT ================= */
  const payment = await StudentPayment.create({
    clerkId: null,
    sessionId,
    studentId,
    classId,
    streamId: streamId || null,
    amountPaid: amount,
    paymentMode: "ONLINE",
    paymentType: "ONLINE",
    paymentStatus: "PENDING",
    gateway: "RAZORPAY",
    receiptNo: `RCPT-${Date.now()}`,
  });

  /* ================= CREATE RAZORPAY ORDER ================= */
  const order = await razorpay.orders.create({
    amount: amount * 100, // paise
    currency: "INR",
    receipt: payment.receiptNo,
  });

  /* ================= SAVE ORDER ID ================= */
  payment.gatewayOrderId = order.id;
  await payment.save();

  res.status(200).json(
    new apiResponse(
      200,
      {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        paymentId: payment._id,
        key: process.env.RAZORPAY_KEY_ID,
      },
      "Razorpay order created"
    )
  );
});



/* ================= VERIFY RAZORPAY PAYMENT ================= */
const verifyRazorpayPayment_old = asyncHandler(async (req, res) => {
  const {
    
    gatewayOrderId,
    gatewayPaymentId,
    gatewaySignature,
  } = req.body;

  if (!gatewayOrderId || !gatewayPaymentId || !gatewaySignature) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Required fields missing"));
  }

  /* =====================================================
     1️⃣ FETCH PAYMENT USING gatewayOrderId
     ===================================================== */
  const payment = await StudentPayment.findOne({
    gatewayOrderId,
  });

  if (!payment) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Payment record not found"));
  }

  if (payment.paymentStatus === "SUCCESS") {
    return res
      .status(200)
      .json(new apiResponse(200, payment, "Payment already verified"));
  }

  /* =====================================================
     2️⃣ VERIFY RAZORPAY SIGNATURE
     ===================================================== */
  const body = `${gatewayOrderId}|${gatewayPaymentId}`;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== gatewaySignature) {
    payment.paymentStatus = "FAILED";
    await payment.save();

    return res
      .status(400)
      .json(new apiResponse(400, null, "Payment verification failed"));
  }

  /* =====================================================
     3️⃣ MARK PAYMENT SUCCESS
     ===================================================== */
  payment.paymentStatus = "SUCCESS";
  payment.gatewayPaymentId = gatewayPaymentId;
  payment.gatewaySignature = gatewaySignature;
  await payment.save();

  let remaining = Number(payment.amountPaid);

  /* =====================================================
     4️⃣ FETCH PREVIOUS SUCCESS PAYMENTS (EXCLUDE CURRENT)
     ===================================================== */
  const studentPaymentIds = await StudentPayment.find({
    studentId: payment.studentId,
    sessionId: payment.sessionId,
    _id: { $ne: payment._id },
    paymentStatus: "SUCCESS",
  }).distinct("_id");

  /* =====================================================
     5️⃣ FETCH TUITION INSTALLMENTS
     ===================================================== */
  const feeStructures = await FeeStructure.find({
    sessionId: payment.sessionId,
    classId: payment.classId,
    streamId: payment.streamId || null,
  });

  const feeStructureIds = feeStructures.map(fs => fs._id);

  const tuitionInstallments = await FeeInstallment.find({
    feeStructureId: { $in: feeStructureIds },
  }).sort({ dueDate: 1 });

  /* =====================================================
     6️⃣ FETCH ADDITIONAL FEES
     ===================================================== */
  const additionalFees = await AdditionalFee.find({
    sessionId: payment.sessionId,
    $or: [
      { classId: null },
      { classId: payment.classId, streamId: null },
      { classId: payment.classId, streamId: payment.streamId },
    ],
  }).sort({ dueDate: 1 });

  /* =====================================================
     7️⃣ EXISTING TUITION ALLOCATIONS
     ===================================================== */
  const existingTuitionAllocations = await StudentPaymentAllocation.find({
    paymentId: { $in: studentPaymentIds },
    feeType: "TUITION",
    referenceId: { $in: tuitionInstallments.map(i => i._id) },
  });

  const tuitionPaidMap = {};
  existingTuitionAllocations.forEach(a => {
    const key = a.referenceId.toString();
    tuitionPaidMap[key] = (tuitionPaidMap[key] || 0) + a.allocatedAmount;
  });

  /* =====================================================
     8️⃣ APPLY PAYMENT → TUITION FIRST
     ===================================================== */
  for (const inst of tuitionInstallments) {
    if (remaining <= 0) break;

    const alreadyPaid = tuitionPaidMap[inst._id.toString()] || 0;
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

  /* =====================================================
     9️⃣ APPLY PAYMENT → ADDITIONAL FEES
     ===================================================== */
  for (const fee of additionalFees) {
    if (remaining <= 0) break;

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

    const alreadyPaid = paidAgg[0]?.total || 0;
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

  /* =====================================================
     🔟 RESPONSE
     ===================================================== */
  res.status(200).json(
    new apiResponse(
      200,
      payment,
      "Payment verified and fee allocated successfully"
    )
  );
});

/* ================= VERIFY RAZORPAY PAYMENT ================= */
const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const { gatewayOrderId, gatewayPaymentId, gatewaySignature } = req.body;

  if (!gatewayOrderId || !gatewayPaymentId || !gatewaySignature) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Required fields missing"));
  }

  /* =====================================================
     1️⃣ FETCH PAYMENT USING gatewayOrderId
     ===================================================== */
  const payment = await StudentPayment.findOne({ gatewayOrderId });

  if (!payment) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Payment record not found"));
  }

  if (payment.paymentStatus === "SUCCESS") {
    return res
      .status(200)
      .json(new apiResponse(200, payment, "Payment already verified"));
  }

  /* =====================================================
     2️⃣ VERIFY RAZORPAY SIGNATURE
     ===================================================== */
  const body = `${gatewayOrderId}|${gatewayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== gatewaySignature) {
    payment.paymentStatus = "FAILED";
    await payment.save();

    return res
      .status(400)
      .json(new apiResponse(400, null, "Payment verification failed"));
  }

  /* =====================================================
     3️⃣ MARK PAYMENT SUCCESS
     ===================================================== */
  payment.paymentStatus = "SUCCESS";
  payment.gatewayPaymentId = gatewayPaymentId;
  payment.gatewaySignature = gatewaySignature;
  await payment.save();

  let remaining = Number(payment.amountPaid);

  /* =====================================================
     4️⃣ FETCH PREVIOUS SUCCESS PAYMENTS (EXCLUDE CURRENT)
     ===================================================== */
  const studentPaymentIds = await StudentPayment.find({
    studentId: payment.studentId,
    sessionId: payment.sessionId,
    paymentStatus: "SUCCESS",
    _id: { $ne: payment._id },
  }).distinct("_id");

  /* =====================================================
     5️⃣ FETCH TUITION INSTALLMENTS
     ===================================================== */
  const feeStructures = await FeeStructure.find({
    sessionId: payment.sessionId,
    classId: payment.classId,
    streamId: payment.streamId || null,
  });

  const feeStructureIds = feeStructures.map(fs => fs._id);

  const tuitionInstallments = await FeeInstallment.find({
    feeStructureId: { $in: feeStructureIds },
  });

  /* =====================================================
     6️⃣ FETCH ADDITIONAL FEES
     ===================================================== */
  const additionalFees = await AdditionalFee.find({
    sessionId: payment.sessionId,
    $or: [
      { classId: null },
      { classId: payment.classId, streamId: null },
      { classId: payment.classId, streamId: payment.streamId },
    ],
  });

  /* =====================================================
     7️⃣ EXISTING TUITION PAID MAP
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
     8️⃣ BUILD UNIFIED PAYABLE TIMELINE (🔥 KEY FIX)
     ===================================================== */
  const payableItems = [];

  // Tuition
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

  // Additional
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
     9️⃣ SORT → DUE DATE, TUITION FIRST
     ===================================================== */
  payableItems.sort((a, b) => {
    const dateDiff = new Date(a.dueDate) - new Date(b.dueDate);
    if (dateDiff !== 0) return dateDiff;

    if (a.feeType === b.feeType) return 0;
    return a.feeType === "TUITION" ? -1 : 1;
  });

  /* =====================================================
     🔟 APPLY PAYMENT SEQUENTIALLY
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
     1️⃣1️⃣ RESPONSE
     ===================================================== */
  res.status(200).json(
    new apiResponse(
      200,
      payment,
      "Payment verified and fee allocated successfully"
    )
  );
});



export { createRazorpayOrder,
  verifyRazorpayPayment
 };