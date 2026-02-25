import { Router } from "express";
import {
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  deleteSession,
  migrateSessionOrder,
} from "../../controllers/master/sessionController.js";

import { verifyJWT } from "../../middlewares/authTypeMiddleware.js";

const router = Router();

// 🔹 Public Routes
router.get("/", getAllSessions);
router.get("/:id", getSessionById);

router.put("/migrateSessionOrder", migrateSessionOrder);

// 🔹 Protected/Admin Routes
router.post("/", verifyJWT, createSession);
router.put("/:id", verifyJWT, updateSession);
router.delete("/:id", verifyJWT, deleteSession);

export default router;
