import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { connectionServices } from "./connection.service";

const sendRequest = catchAsync(async (req, res) => {
  const { receiverId } = req.params;
  const senderId = req.user.id;
  const connection = await connectionServices.sendRequest(senderId, receiverId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Connection request sent successfully.",
    data: connection,
  });
});

const acceptConnection = catchAsync(async (req, res) => {
  const { connectionId } = req.params;
  const userId = req.user.id;
  await connectionServices.acceptConnection(connectionId, userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "connection request accept successfull",
  });
});

const ignoreConnection = catchAsync(async (req, res) => {
  const { connectionId } = req.params;
  const userId = req.user.id;
  await connectionServices.ignoreConnection(connectionId, userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "connection request cancelled successfull",
  });
});

const cancelConnection = catchAsync(async (req, res) => {
  const { connectionId } = req.params;
  const userId = req.user.id;
  await connectionServices.cancelConnection(connectionId, userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "connection request cancelled successfull",
  });
});

const getReceivedRequests = catchAsync(async (req, res) => {
  const connections = await connectionServices.getReceivedRequests(req);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Received connection requests fetched successfully.",
    data: connections,
  });
});

const myConnections = catchAsync(async (req, res) => {
  const result = await connectionServices.myConnections(req, req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Your connections return successfully",
    data: result,
  });
});

const inviteMembers = catchAsync(async (req, res) => {
  const { communityId } = req.params;
  const result = await connectionServices.inviteMembers(
    req,
    req.user.id,
    communityId
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Your connections return successfully",
    data: result,
  });
});

const userConnections = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const result = await connectionServices.userConnections(
    req,
    userId,
    req.user.id
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User connections return successfully",
    data: result,
  });
});

const recommendationContacts = catchAsync(async (req, res) => {
  const result = await connectionServices.recommendationContacts(req);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User connections return successfully",
    data: result,
  });
});

const contactProfile = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { senderId } = req.params;
  const result = await connectionServices.contactProfile(senderId, userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "contact profile retrived successfully",
    data: result,
  });
});

const sentRequests = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await connectionServices.sentRequests(userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "sent requests retrived successfully",
    data: result,
  });
});

export const connectionController = {
  sendRequest,
  acceptConnection,
  ignoreConnection,
  cancelConnection,
  myConnections,
  userConnections,
  getReceivedRequests,
  contactProfile,
  recommendationContacts,
  sentRequests,
  inviteMembers,
};
