import mongoose from "mongoose";

/* ================= DOCUMENTS SCHEMA ================= */
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

/* ================= EXPERIENCE SCHEMA ================= */
const ExperienceSchema = new mongoose.Schema(
  {
    schoolName: String,
    designation: String,
    startDate: Date,
    endDate: Date,
    subjects: [String],
    comments: String,
  },
  { _id: false },
);

/* ================= TEACHER SCHEMA ================= */
const TeacherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    /* ================= PERSONAL ================= */
    firstName: { type: String, required: true },
    middleName: String,
    lastName: String,
    dob: Date,
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    category: String,
    religion: String,
    caste: String,
    aadhaarNo: String,
    profilePic: String,
    phone: { type: String, required: true },
    email: String,
    emergencyContact: {
      name: String,
      relation: String,
      phone: String,
    },

    /* ================= ADDRESS ================= */
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

    /* ================= EMPLOYMENT ================= */
    employeeId: String,
    dateOfJoining: Date,
    department: String,
    designation: String,

    employmentType: {
      type: String,
      enum: ["Permanent", "Contract", "Temporary"],
      default: "Permanent",
    },

    subjects: [String],
    medium: String,
    classesAssigned: [
      {
        session: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Session",
        },
        stream: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Stream",
        },

        classId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Class",
        },

        sectionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Section",
        },

        subjectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subject",
        },

        isClassTeacher: {
          type: Boolean,
          default: false,
        },
      },
    ],

    house: String,
    shift: String,

    /* ================= EXPERIENCE ================= */
    experience: [ExperienceSchema],
    totalExperience: String,

    /* ================= SALARY ================= */
    salary: String,
    bankAccount: {
      accountNumber: String,
      bankName: String,
      ifsc: String,
    },

    specialAllowance: String,
    remarks: String,

    /* ================= DOCUMENTS ================= */
    documents: [DocumentsSchema],

    /* ================= STATUS ================= */
    status: {
      type: String,
      enum: ["Active", "On Leave", "Resigned", "Retired"],
      default: "Active",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Teacher", TeacherSchema);
