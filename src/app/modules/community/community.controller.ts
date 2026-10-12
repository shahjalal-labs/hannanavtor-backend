import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { communityServices } from "./community.service";

const createCommunity = catchAsync(async (req, res) => {
  const result = await communityServices.createCommunity(req);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Community created successfully",
    data: result,
  });
});

const myCommunity = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await communityServices.myCommunity(userId);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Community retrived successfully",
    data: result,
  });
});

const suggestedCommunity = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await communityServices.suggestedCommunity(userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Suggested community retrived successfully",
    data: result,
  });
});

const joinCommunity = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { communityId } = req.params;
  const result = await communityServices.joinCommunity(userId, communityId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "join community successfull",
    data: result,
  });
});

const inviteCommunity = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { communityId, inviterId } = req.params;
  const result = await communityServices.inviteCommunity(
    inviterId,
    userId,
    communityId
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "invite the community successfull",
    data: result,
  });
});

const myInvitations = catchAsync(async (req, res) => {
  const result = await communityServices.myInvitations(req);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "my invitations retrived successfull",
    data: result,
  });
});

const deleteInvitedCommunity = catchAsync(async (req, res) => {
  const { invitedId } = req.params;
  const result = await communityServices.deleteInvitedCommunity(invitedId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "delete invited community successfull",
    data: result,
  });
});

const joinedCommunities = catchAsync(async (req, res) => {
  const result = await communityServices.joinedCommunities(req);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "joined communities retrived successfull",
    data: result,
  });
});

const createCommunityPost = catchAsync(async (req, res) => {
  const { communityId } = req.params;
  const userId = req.user.id;
  const result = await communityServices.createCommunityPost(
    communityId,
    userId,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "community post created successfull",
    data: result,
  });
});

const communityInfo = catchAsync(async (req, res) => {
  const { communityId } = req.params;
  const userId = req.user.id;
  const result = await communityServices.communityInfo(userId, communityId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "community retrived successfull",
    data: result,
  });
});

const communityMembers = catchAsync(async (req, res) => {
  const { communityId } = req.params;
  const userId = req.user.id;
  const result = await communityServices.communityMembers(userId, communityId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "community retrived successfull",
    data: result,
  });
});

const likeUnlikePost = catchAsync(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  const data = await communityServices.likeUnlikePost(userId, postId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: data,
  });
});

export const communityControllers = {
  createCommunity,
  myCommunity,
  joinCommunity,
  inviteCommunity,
  myInvitations,
  suggestedCommunity,
  deleteInvitedCommunity,
  joinedCommunities,
  createCommunityPost,
  communityInfo,
  communityMembers,
  likeUnlikePost,
};
