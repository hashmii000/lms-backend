import mongoose from "mongoose";

const SiblingSchema = new mongoose.Schema(
  {
    siblingStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentEnrolment",
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
    },
  },
  { _id: false },
);

const DocumentsSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
    },
    documentNumber: String,
    document: String,
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);


const StudentEnrolmentSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    studentRegistrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentRegistration",
    },
    phone: {
      type: String,
      required: true,
    },
    rollNumber: String,
    formId: String,
    studentId: String,
    srNumber: String,
    registrationNo: String,
    aadhaarNo: String,
    formNo: String,

    /* ================= PERSONAL ================= */

    firstName: String,
    middleName: String,
    lastName: String,
    dob: Date,
    category: String,
    religion: String,
    caste: String,
    child: String,
    minority: String,
    income: String,
    profilePic: String,

    /* ================= PARENTS ================= */
    fatherName: String,
    motherName: String,
    fatherOccupation: String,
    motherOccupation: String,

    /* =================  ADDRESS ================= */
    address: {
      present: {
        Address1: String,
        Address2: String,
        City: String,
        State: String,
        Pin: String,
        Mobile: String,
        Email: String,
      },
      permanent: {
        Address1: String,
        Address2: String,
        City: String,
        State: String,
        Pin: String,
        Mobile: String,
        Email: String,
      },
    },

    schoolName: String,
    studentType: String,
    medium: String,
    currentClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    admissionClass: String,
    previousStream: String,
    previousMedium: String,

    currentSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
    },
    stream: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stream",
    },
    // stream: String,
    house: String,
    admissionMonth: String,
    admissionDate: Date,

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    status: {
      type: String,
      enum: ["Studying", "Passed", "Left"],
      default: "Studying",
    },
    resultStatus: {
      type: String,
      enum: ["Pass", "Fail", ""],
      default: "",
    },
    studentType: {
      type: String,
    },

    remark: String,

    /* ================= ACADEMIC ================= */
    tcSubmit: {
      type: Boolean,
      default: false,
    },
    lastPassedExam: String,
    leavingSession: String,
    previousSchool: String,
    leavingReason: String,
    medicalComment: String,
    handicapped: String,

    /* ================= TRANSPORT ================= */
    transportRequired: {
      type: Boolean,
      default: false,
    },
    transportWay: String,
    busNo: String,
    stationName: String,
    busFee: String,

    /* ================= SIBLING ================= */
    brotherSisterApplied: {
      type: Boolean,
      default: false,
    },
    sibling: [SiblingSchema],

    /* ================= FEE / CONCESSION ================= */
    fullFeeConcession: {
      type: Boolean,
      default: false,
    },
    fullFeeExceptTransport: {
      type: Boolean,
      default: false,
    },
    headWiseConcession: String,
    specialComment: String,
    discount: String,

    discountType: {
      type: String,
      enum: ["%", "₹"],
      default: "%",
    },

    /* ================= DOCUMENTS ================= */
    documents: [DocumentsSchema],
  },
  { timestamps: true },
);

export default mongoose.model("StudentEnrolment", StudentEnrolmentSchema);
