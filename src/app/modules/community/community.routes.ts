import express from "express";
import auth from "../../middlewares/auth";
import { communityControllers } from "./community.controller";
import { fileUploader } from "../../../helpers/fileUploader";
import { parseBodyData } from "../../middlewares/parseBodyData";

const router = express.Router();

router.post(
  "/create",
  auth(),
  fileUploader.communityPhoto,
  parseBodyData,
  communityControllers.createCommunity
);
router.get("/my-community", auth(), communityControllers.myCommunity);
router.post(
  "/join-community/:communityId",
  auth(),
  communityControllers.joinCommunity
);
router.post(
  "/invite-community/:communityId/:inviterId",
  auth(),
  communityControllers.inviteCommunity
);
router.get("/my-invitations", auth(), communityControllers.myInvitations);
router.get(
  "/suggest-community",
  auth(),
  communityControllers.suggestedCommunity
);
router.delete(
  "/delete/invited-community/:invitedId",
  auth(),
  communityControllers.deleteInvitedCommunity
);
router.get(
  "/joined-communities",
  auth(),
  communityControllers.joinedCommunities
);
router.post(
  "/post-community/:communityId",
  auth(),
  communityControllers.createCommunityPost
);
router.get("/:communityId", auth(), communityControllers.communityInfo);
router.get(
  "/members/:communityId",
  auth(),
  communityControllers.communityMembers
);
router.post("/like-unlike/:postId", auth(), communityControllers.likeUnlikePost);

export const communityRoutes = router;
