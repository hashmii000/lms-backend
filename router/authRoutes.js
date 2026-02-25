import { Router } from "express";
import {
  createPassword,
  getUserById,
  deleteUser,
  getAllUsers,
  getProfile,
  loginWithPassword,
  registerOrLogin,
  resendOtp,
  updatePassword,
  updateUserById,
  updateUserRoll,
  verifyOtp,
} from "../controllers/authController.js";
import {
  authorizeUserType,
  verifyJWT,
} from "../middlewares/authTypeMiddleware.js";

const routes = Router();

// auth
routes.post("/registerOrLogin", registerOrLogin);
routes.post("/verifyOtp", verifyOtp);
routes.post("/resendOtp", resendOtp);
routes.patch("/update/:id", updateUserById);
routes.delete("/delete/:id", verifyJWT, deleteUser);
routes.get("/getAllUsers", getAllUsers);
routes.get("/profile", verifyJWT, getProfile);
routes.post("/loginWithPassword", loginWithPassword);
routes.post("/createPassword", createPassword);
routes.post("/updatePassword", verifyJWT, updatePassword);
routes.put("/updateRoll/:userId", updateUserRoll);
routes.patch("/update/:id", updateUserById);

// ✅ Get User by ID
routes.get("/user/:userId", getUserById);

export default routes;
