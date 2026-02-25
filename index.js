import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import authRoutes from "./router/authRoutes.js";
import uploadRoutes from "./router/uploadRoutes.js";
import categoryRoutes from "./router/categoryRoutes.js";
import bannerRoutes from "./router/bannerRoutes.js";
import serviceRoutes from "./router/servicesRoutes.js";
import galleryRoutes from "./router/galleryRoutes.js";
import testimonialsRoutes from "./router/TestimonialsRoutes.js";
import studentRegistrationsRoutes from "./router/studentRegistrationRoutes.js";
import classRoutes from "./router/master/classRoutes.js";
import studentEnrollmentRoutes from "./router/studentEnrolmentRoutes.js";
import sectionRoutes from "./router/master/sectionRoutes.js";
import documentsRoutes from "./router/master/documentRoutes.js";
import sessionRoutes from "./router/master/sessionRoutes.js";
import studentsTransferRoutes from "./router/studentTransferRoutes.js";
import teacherRoutes from "./router/teacherRoutes.js";
import noticeRoutes from "./router/noticeRoutes.js";
import attendanceRoutes from "./router/attendanceRoutes.js";
import subjectRoutes from "./router/master/subjectRoutes.js";
import examRoutes from "./router/master/examRoutes.js";
import streamRoutes from "./router/master/streamRoutes.js";
import feeStructureRoutes from "./router/master/feeStructureRoutes.js";
import additionalFeeRoutes from "./router/master/additionalFeeRoutes.js";
import feeInstallmentRoutes from "./router/master/feeInstallmentRoutes.js";
import studentFeeRoutes from "./router/master/studentFeeRoutes.js";
import reportRoutes from "./router/master/reportRoutes.js";
import razorpayRoutes from "./router/master/razorpayRoutes.js";

// import marksRoutes from "./router/marksRoutes.js";
import examListRoutes from "./router/master/examListRoutes.js";
import marksheetRoutes from "./router/marksheetRoutes.js";

dotenv.config();
const app = express();

const clientUrl = process.env.CLIENT_URL;
app.use(
  cors({
    origin: clientUrl || "*",
    credentials: true,
  })
);
import cookieParser from "cookie-parser";
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/banner", bannerRoutes);
app.use("/api/service", serviceRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/testimonials", testimonialsRoutes);

//LMS Routes
app.use("/api/studentRegistrations", studentRegistrationsRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/studentEnrollment", studentEnrollmentRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/studentTransfer", studentsTransferRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/marks", marksheetRoutes);
app.use("/api/examsList", examListRoutes);
app.use("/api/streams", streamRoutes);
app.use("/api/fee-structures", feeStructureRoutes);
app.use("/api/additional-fees", additionalFeeRoutes);
app.use("/api/fee-installments", feeInstallmentRoutes);
app.use("/api/student-fees", studentFeeRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/payments", razorpayRoutes);


//const PORT = process.env.PORT || 5000;
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  connectDB();
});
