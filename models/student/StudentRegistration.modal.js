import mongoose from "mongoose";

const StudentRegistrationSchema = new mongoose.Schema(
    {

        session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Session",
        },
        phone: {
            type: String,
            required: true,
        },
        formNo: {
            type: String,
        },
        registrationDate: {
            type: Date,
            default: Date.now,
        },
        studentEnrolmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StudentEnrolment",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        firstName: String,
        middleName: String,
        lastName: String,
        fatherName: String,
        gender: String,
        currentClass: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
        },
        handicapped: String,
        studentType: String,
        registrationFee: String,
        paymentMode: String,
        address: String,
        city: String,
        remark: String,

        isEnroll: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);





export default mongoose.model(
    "StudentRegistration",
    StudentRegistrationSchema
);
