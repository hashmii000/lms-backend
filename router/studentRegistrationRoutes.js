import { Router } from "express";
import {
    createStudentRegistration,
    getAllStudentRegistrations,
    getStudentRegistrationById,
    updateStudentRegistration,
    deleteStudentRegistration,
} from "../controllers/studentRegistrationController.js";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = Router();

router.get("/", getAllStudentRegistrations);
router.get("/:id", getStudentRegistrationById);

router.post("/", verifyJWT, createStudentRegistration);
router.put("/:id", verifyJWT, updateStudentRegistration);
router.delete("/:id", verifyJWT, deleteStudentRegistration);

export default router;
