import express from "express";
import {
  createNotice,
  getAllNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
} from "../controllers/NoticeController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = express.Router();

router.use(verifyJWT);

router.post("/", createNotice);
router.put("/:id", updateNotice);
router.get("/", getAllNotices);
router.get("/:id", getNoticeById);
router.delete("/:id", deleteNotice);

export default router;
