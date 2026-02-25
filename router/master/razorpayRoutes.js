import { Router } from "express";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../../controllers/payments/RazorpayController.js";

import { verifyJWT } from "../../middlewares/authTypeMiddleware.js";

const router = Router();

/* ================= CREATE ORDER ================= */
// router.post("/create-order", verifyJWT, createRazorpayOrder );
router.post("/create-order", createRazorpayOrder );

/* ================= VERIFY PAYMENT ================= */
// router.post("/verify-payment", verifyJWT, verifyRazorpayPayment );
router.post("/verify-payment",  verifyRazorpayPayment );


export default router;