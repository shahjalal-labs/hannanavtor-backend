import express from "express";
import { userControllers } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import { userValidation } from "./user.validation";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";

const router = express.Router();

router.post(
  "/create",
  validateRequest(userValidation.registrationSchema),
  userControllers.createUser
);
router.post(
  "/signup-verification",
  validateRequest(userValidation.verificationSchema),
  userControllers.signupVerification
);
router.get("/", auth(UserRole.ADMIN), userControllers.getUsers);
router.get("/:id", auth(), userControllers.getSingleUser);
router.put("/:id", auth(UserRole.ADMIN), userControllers.updateUser);
router.delete("/:id", auth(UserRole.ADMIN), userControllers.deleteUser);

export const userRoutes = router;
