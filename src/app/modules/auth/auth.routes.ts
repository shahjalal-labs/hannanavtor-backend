import express from "express";
import { authController } from "./auth.controller";
import validateRequest from "../../middlewares/validateRequest";
import { authValidation } from "./auth.validation";
import auth from "../../middlewares/auth";
import { fileUploader } from "../../../helpers/fileUploader";

const router = express.Router();

//login user
router.post("/login", authController.loginUser);
router.post(
  "/auth-login",
  validateRequest(authValidation.authLoginSchema),
  authController.authLogin
);
router.get("/profile", auth(), authController.getProfile);
router.get("/contact-profile", auth(), authController.myContactProfile);
router.patch(
  "/update/user-location",
  auth(),
  authController.updateUserLocation
);
router.post("/send-otp", authController.sendForgotPasswordOtp);
router.post("/verify-otp", authController.verifyForgotPasswordOtpCode);
router.patch("/reset-password", auth(), authController.resetPassword);
router.put(
  "/profile",
  validateRequest(authValidation.updateProfileSchema),
  auth(),
  authController.updateProfile
);
router.patch(
  "/profile-image",
  auth(),
  fileUploader.profileImage,
  authController.updateProfileImage
);

export const authRoute = router;
