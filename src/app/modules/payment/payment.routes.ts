import express from "express";
import auth from "../../middlewares/auth";
import { paymentControllers } from "./payment.controller";

const router = express.Router();

router.post(
  "/onboarding/create-subscription",
  auth(),
  paymentControllers.createOnboarding
);
router.post("/onboarding/create-plan", auth(), paymentControllers.createPlan);
router.post(
  "/onboarding/buy-subscription",
  auth(),
  paymentControllers.buySubscription
);
router.get("/wallet-balance", auth(), paymentControllers.myWalletBalance);
router.post("/withdraw-balance", auth(), paymentControllers.withdrawBalance);
router.get("/my-activity", auth(), paymentControllers.myPaymentActivity);
router.post("/add-money", auth(), paymentControllers.addMoney);
router.get("/my-balance", auth(), paymentControllers.myBalance);

export const paymentRoutes = router;
