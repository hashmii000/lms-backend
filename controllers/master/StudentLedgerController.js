import FeeInstallment from "../../models/master/FeeInstallment.model.js";
import AdditionalFee from "../../models/master/AdditionalFee.model.js";
import StudentPaymentAllocation from "../../models/master/StudentPaymentAllocation.model.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import FeeStructure from "../../models/master/FeeStructure.model.js";
import StudentPayment from "../../models/master/StudentPayment.model.js";
import StudentEnrolment from "../../models/student/StudentEnrolment.modal.js";



/* ================= GET STUDENT LEDGER ================= 
const getStudentLedger = asyncHandler(async (req, res) => {
  try {
    const { sessionId, studentId, classId, streamId } = req.query;

    if (!sessionId || !studentId || !classId) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Required fields missing"));
    }

    //  FETCH FEE STRUCTURES (SESSION + CLASS + STREAM)  

    const feeStructures = await FeeStructure.find({
      sessionId,
      classId,
      streamId: streamId || null,
    });

    const feeStructureIds = feeStructures.map(fs => fs._id);

    // FETCH TUITION INSTALLMENTS (VIA feeStructureId) 

    const installments = await FeeInstallment.find({
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

    //FETCH STUDENT-SPECIFIC ALLOCATIONS

    const allocations = await StudentPaymentAllocation.find({
      paymentId: {
        $in: await StudentPayment.find({ studentId }).distinct("_id"),
      },
    });

    const allocationMap = {};
    allocations.forEach(a => {
      const key = a.referenceId.toString();
      allocationMap[key] = (allocationMap[key] || 0) + a.allocatedAmount;
    });

    //BUILD LEDGER
    const ledger = [];

    // Tuition first
    installments.forEach(inst => {
      const paid = allocationMap[inst._id.toString()] || 0;
      const due = inst.amount - paid;

      ledger.push({
        type: "TUITION",
        referenceId: inst._id,
        period: inst.period,
        feeHead: "Tuition Fee",
        totalAmount: inst.amount,
        paidAmount: paid,
        dueAmount: due,
        status:
          paid === 0 ? "DUE" : paid < inst.amount ? "PARTIAL" : "PAID",
      });
    });

    // Additional fees
    additionalFees.forEach(fee => {
      const paid = allocationMap[fee._id.toString()] || 0;
      const due = fee.amount - paid;

      ledger.push({
        type: "ADDITIONAL",
        referenceId: fee._id,
        period: fee.period,
        feeHead: fee.feeName,
        totalAmount: fee.amount,
        paidAmount: paid,
        dueAmount: due,
        status:
          paid === 0 ? "DUE" : paid < fee.amount ? "PARTIAL" : "PAID",
      });
    });

    res
      .status(200)
      .json(new apiResponse(200, ledger, "Student ledger fetched"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, error.message));
  }
});*/

/* ================= GET STUDENT LEDGER (GROUPED BY MONTH) ================= */
const getStudentLedger = asyncHandler(async (req, res) => {
  const { sessionId, studentId, classId, streamId } = req.query;

  if (!sessionId || !studentId || !classId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Required fields missing"));
  }

  // FETCH STUDENT INFO (SESSION-WISE)
  const student = await StudentEnrolment.findOne({
    session: sessionId,
    userId: studentId,
  })
    .populate("currentClass")
    .populate("currentSection");

  if (!student) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Student not found for this session"));
  }

  const studentInfo = {
    studentId: student.studentId,
    name: `${student.firstName} ${student.lastName || ""}`.trim(),
    fatherName: student.fatherName,
    phone: student.phone,
    class: student.currentClass?.name || "",
    section: student.currentSection?.name || "",
  };

  // FEE STRUCTURES
  const feeStructures = await FeeStructure.find({
    sessionId,
    classId,
    streamId: streamId || null,
  });

  const feeStructureIds = feeStructures.map(fs => fs._id);

  // TUITION INSTALLMENTS
  const installments = await FeeInstallment.find({
    feeStructureId: { $in: feeStructureIds },
  });

  // ADDITIONAL FEES
  const additionalFees = await AdditionalFee.find({
    sessionId,
    $or: [
      { classId: null },
      { classId, streamId: null },
      { classId, streamId },
    ],
  });

  // PAYMENTS & ALLOCATIONS
  const paymentIds = await StudentPayment.find({
    studentId,
  }).distinct("_id");

  const allocations = await StudentPaymentAllocation.find({
    paymentId: { $in: paymentIds },
  });

  const allocationMap = {};
  allocations.forEach(a => {
    const key = a.referenceId.toString();
    allocationMap[key] = (allocationMap[key] || 0) + a.allocatedAmount;
  });

  //  BUILD FLAT LEDGER
  const ledgerItems = [];

  installments.forEach(inst => {
    const paid = allocationMap[inst._id.toString()] || 0;
    ledgerItems.push({
      type: "TUITION",
      referenceId: inst._id,
      feeHead: "Tuition Fee",
      period: inst.period,
      dueDate: inst.dueDate,
      totalAmount: inst.amount,
      paidAmount: paid,
      dueAmount: inst.amount - paid,
    });
  });

  additionalFees.forEach(fee => {
    const paid = allocationMap[fee._id.toString()] || 0;
    ledgerItems.push({
      type: "ADDITIONAL",
      referenceId: fee._id,
      feeHead: fee.feeName,
      period: fee.period,
      dueDate: fee.dueDate,
      totalAmount: fee.amount,
      paidAmount: paid,
      dueAmount: fee.amount - paid,
    });
  });

  // GROUP BY MONTH (DISPLAY)
  // GROUP BY ACADEMIC PERIOD (APRIL, MAY, APR-JUN, etc.)
  const groupedMap = {};   // internal map

  ledgerItems.forEach(item => {
    const periodKey = item.period; // e.g. "APRIL", "APR-JUN"
  
    if (!groupedMap[periodKey]) {
      groupedMap[periodKey] = {
        period: periodKey,     // 🔥 include period explicitly
        items: [],
        totalAmount: 0,
        totalPaid: 0,
        totalDue: 0,
      };
    }
  
    const status =
      item.paidAmount === 0
        ? "DUE"
        : item.paidAmount < item.totalAmount
        ? "PARTIAL"
        : "PAID";
  
    groupedMap[periodKey].items.push({
      ...item,
      status,
    });
  
    groupedMap[periodKey].totalAmount += item.totalAmount;
    groupedMap[periodKey].totalPaid += item.paidAmount;
    groupedMap[periodKey].totalDue += item.dueAmount;
  });

  const groupedLedger = Object.values(groupedMap);

  // FINAL RESPONSE
  res.status(200).json(
    new apiResponse(
      200,
      {
        student: studentInfo,
        ledger: groupedLedger,
      },
      "Student ledger fetched successfully"
    )
  );
});

//export { getStudentLedgerGrouped };

export { getStudentLedger };