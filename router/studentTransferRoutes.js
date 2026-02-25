import express from "express";
import { createStudentsTransfer } from "../controllers/studentsTransferController.js";

const router = express.Router();

router.post("/", createStudentsTransfer);

export default router;
