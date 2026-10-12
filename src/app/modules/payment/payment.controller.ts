import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { paymentServices } from "./payment.service";

const createOnboarding = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await paymentServices.createOnboarding(userId);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "success",
    data: result,
  });
});

const createPlan = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await paymentServices.createPlan(userId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "success",
    data: result,
  });
});

const buySubscription = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await paymentServices.buySubscription(userId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment successfull",
    data: result,
  });
});

const myWalletBalance = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await paymentServices.myWalletBalance(userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "My wallet balance retrive success",
    data: result,
  });
});

const withdrawBalance = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await paymentServices.withdrawBalance(userId, req.body.amount);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "withdraw request send success",
    data: result,
  });
});

const myPaymentActivity = catchAsync(async (req, res) => {
  const result = await paymentServices.myPaymentActivity(req);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "my activity is retrived successfull",
    data: result,
  });
});

const addMoney = catchAsync(async (req, res) => {
  const userId = req.user.id;
  await paymentServices.addMoney(req.body, userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Add money has been successfully",
  });
});

const myBalance = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await paymentServices.myBalance(userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Your balance retrived successfully",
    data: result,
  });
});

export const paymentControllers = {
  createOnboarding,
  createPlan,
  buySubscription,
  myWalletBalance,
  withdrawBalance,
  myPaymentActivity,
  addMoney,
  myBalance,
};
