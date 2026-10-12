import express from "express";
import auth from "../../middlewares/auth";
import { messageControllers } from "./message.controller";
import { fileUploader } from "../../../helpers/fileUploader";

const router = express.Router();

router.get("/my-rooms", auth(), messageControllers.myRooms);
router.post(
  "/generate-url",
  fileUploader.uploadMultiple,
  messageControllers.generateFileUrl
);
router.post(
  "/generate-access-token",
  auth(),
  messageControllers.generateAccessToken
);

export const messageRoute = router;
