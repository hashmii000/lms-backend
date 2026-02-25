import { Router } from "express";
import {
  createStream,
  getAllStreams,
  getStreamById,
  updateStream,
  deleteStream,
} from "../../controllers/master/StreamController.js";

import { verifyJWT } from "../../middlewares/authTypeMiddleware.js";

const router = Router();

/* ================= PUBLIC ================= */
router.get("/", getAllStreams);
router.get("/:id", getStreamById);

/* ================= PROTECTED ================= */
// router.post("/", verifyJWT, createStream);
router.post("/",verifyJWT,  createStream);
router.put("/:id", verifyJWT, updateStream);
router.delete("/:id", verifyJWT, deleteStream);

export default router;