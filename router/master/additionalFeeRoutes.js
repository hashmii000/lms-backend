import { Router } from "express";
import {
  createAdditionalFee,
  getAdditionalFees,
  updateAdditionalFee,
  deleteAdditionalFee,
} from "../../controllers/master/AdditionalFeeController.js";
import { verifyJWT } from "../../middlewares/authTypeMiddleware.js";

const router = Router();

/* ================= PUBLIC ================= */
router.get("/", getAdditionalFees);

/* ================= PROTECTED ================= */
router.post("/", verifyJWT,  createAdditionalFee);
router.put("/:id", verifyJWT, updateAdditionalFee);
router.delete("/:id", verifyJWT, deleteAdditionalFee);

export default router;