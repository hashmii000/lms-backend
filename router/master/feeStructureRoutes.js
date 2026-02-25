import { Router } from "express";
import {
  createFeeStructure,
  getFeeStructures,
  updateFeeStructure,
  deleteFeeStructure,
  getFullFeeStructureById,
  getFullFeeStructures,
} from "../../controllers/master/FeeStructureController.js";
import { verifyJWT } from "../../middlewares/authTypeMiddleware.js";

const router = Router();

/* ================= PUBLIC ================= */
router.get("/", getFeeStructures);
router.get("/:id/full", getFullFeeStructureById);
router.get("/full", getFullFeeStructures);

/* ================= PROTECTED ================= */
router.post("/", createFeeStructure);
router.put("/:id", verifyJWT, updateFeeStructure);
router.delete("/:id", verifyJWT, deleteFeeStructure);


export default router;