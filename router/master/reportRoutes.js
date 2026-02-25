import { Router } from "express";
import { feeCollectionReport } from "../../controllers/master/FeeCollectionReportController.js";
import { verifyJWT } from "../../middlewares/authTypeMiddleware.js";
const router = Router();

// router.get("/fee-collection", verifyJWT, feeCollectionReport);
router.get("/fee-collection", feeCollectionReport);

export default router;