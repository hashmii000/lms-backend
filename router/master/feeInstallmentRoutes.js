import { Router } from "express";
import {
  getInstallmentsByFeeStructure,
  updateFeeInstallment,
  deleteFeeInstallment,
} from "../../controllers/master/FeeInstallmentController.js";
import { verifyJWT } from "../../middlewares/authTypeMiddleware.js";

const router = Router();

/* ================= PUBLIC ================= */
router.get(
  "/fee-structure/:feeStructureId",
  getInstallmentsByFeeStructure
);

/* ================= PROTECTED ================= */
router.put("/:id", verifyJWT, updateFeeInstallment);
router.delete("/:id", verifyJWT, deleteFeeInstallment);

export default router;