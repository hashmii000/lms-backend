import { Router } from "express";
import {
    createNotification,
    getAllNotifications,
    getNotificationById,
    markNotificationAsRead,
    markAllAsRead,
    deleteNotification,
} from "../controllers/NotificationController.js";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";


const router = Router();


router.get("/", getAllNotifications);
router.get("/:id", getNotificationById);
router.post("/", createNotification);
router.patch("/:id/read", markNotificationAsRead);
router.patch("/read-all", markAllAsRead);
router.delete("/:id", deleteNotification);

export default router;
