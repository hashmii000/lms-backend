import { Router } from "express";
import { getStudentLedger } from "../../controllers/master/StudentLedgerController.js";
import { collectStudentFee } from "../../controllers/master/FeeCollectionController.js";

const router = Router();

router.get("/ledger", getStudentLedger);
router.post("/collect", collectStudentFee);

export default router;