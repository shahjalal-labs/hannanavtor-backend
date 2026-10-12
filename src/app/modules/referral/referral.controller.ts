import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { referralServices } from "./referral.service";

const createReferralCode = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { usedReferralCode } = req.body;
  await referralServices.createReferralCode(userId, usedReferralCode);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Successfully refer this code",
  });
});

const createReferral = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await referralServices.createReferral(userId, req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Successfully create referral",
    data: result,
  });
});

const createReview = catchAsync(async (req, res) => {
  const { referralId } = req.params;
  const clientId = req.user.id;
  const result = await referralServices.createReview(
    referralId,
    clientId,
    req.body
  );
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Successfully create review",
    data: result,
  });
});

const myReferrals = catchAsync(async (req, res) => {
  const result = await referralServices.myReferrals(req);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "my referral retrived successfully",
    data: result,
  });
});

const myServices = catchAsync(async (req, res) => {
  const result = await referralServices.myServices(req);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "my services retrived successfully",
    data: result,
  });
});

const mySubscriptions = catchAsync(async (req, res) => {
  const result = await referralServices.mySubscriptions(req);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "my subscriptions retrived successfully",
    data: result,
  });
});

const referralDetails = catchAsync(async (req, res) => {
  const { referralId } = req.params;
  const result = await referralServices.referralDetails(referralId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Referral Details Retrived Successfull",
    data: result,
  });
});

const createOffer = catchAsync(async (req, res) => {
  const { referralId } = req.params;
  const userId = req.user.id;
  const result = await referralServices.createOffer(
    referralId,
    userId,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Offer has been created successfully",
    data: result,
  });
});

const updateReferralStatus = catchAsync(async (req, res) => {
  const { referralId } = req.params;
  const userId = req.user.id;
  const status = req.body.status;
  const result = await referralServices.updateReferralStatus(
    referralId,
    userId,
    status
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Referral Status Update Successfull",
    data: result,
  });
});

const myReferInfo = catchAsync(async (req, res) => {
  const result = await referralServices.myReferInfo(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "My refer info retrive successfully",
    data: result,
  });
});

const myReviews = catchAsync(async (req, res) => {
  const { orderBy = "desc", rating } = req.query;
  const result = await referralServices.myReviews(
    req.user.id,
    orderBy as string,
    rating as string
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "My reviews retrive successfully",
    data: result,
  });
});

export const referralControllers = {
  createReferralCode,
  createReferral,
  createReview,
  myReferrals,
  myServices,
  mySubscriptions,
  referralDetails,
  createOffer,
  updateReferralStatus,
  myReferInfo,
  myReviews,
};
