import express from "express";
import auth from "../../middlewares/auth";
import { connectionController } from "./connection.controller";

const router = express.Router();

router.post(
  "/send-request/:receiverId",
  auth(),
  connectionController.sendRequest
);
router.patch(
  "/accept-connection/:connectionId",
  auth(),
  connectionController.acceptConnection
);
router.patch(
  "/ignore-connection/:connectionId",
  auth(),
  connectionController.ignoreConnection
);
router.delete(
  "/cancel-connection/:connectionId",
  auth(),
  connectionController.cancelConnection
);
router.get(
  "/received-requests",
  auth(),
  connectionController.getReceivedRequests
);
router.get("/my-connections", auth(), connectionController.myConnections);
router.get(
  "/invite-members/:communityId",
  auth(),
  connectionController.inviteMembers
);
router.get(
  "/user-connections/:userId",
  auth(),
  connectionController.userConnections
);
router.get(
  "/contact-profile/:senderId",
  auth(),
  connectionController.contactProfile
);
router.get(
  "/recommended-contacts",
  auth(),
  connectionController.recommendationContacts
);
router.get("/sent-requests", auth(), connectionController.sentRequests);

export const connectionRoutes = router;
