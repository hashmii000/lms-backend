import { Router } from "express";
import {
  createDocument,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
} from "../../controllers/master/DocumentController.js";

import { verifyJWT } from "../../middlewares/authTypeMiddleware.js";

const router = Router();

// 🔹 Public Routes
router.get("/", getAllDocuments);
router.get("/:id", getDocumentById);

// 🔹 Protected/Admin Routes
router.post("/", verifyJWT, createDocument);
router.put("/:id", verifyJWT, updateDocument);
router.delete("/:id", verifyJWT, deleteDocument);

export default router;
