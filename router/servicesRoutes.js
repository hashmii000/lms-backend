import { Router } from "express";
import {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
} from "../controllers/ServicesControllers.js";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = Router();

// ✅ Public Routes
router.get("/", getAllServices);
router.get("/:id", getServiceById);

// ✅ Protected/Admin Routes
router.post("/", verifyJWT, createService);
router.put("/:id", verifyJWT, updateService);
router.delete("/:id", verifyJWT, deleteService);

export default router;
