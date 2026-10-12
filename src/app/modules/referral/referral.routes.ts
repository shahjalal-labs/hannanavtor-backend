import express from "express";
import auth from "../../middlewares/auth";
import { referralControllers } from "./referral.controller";
import validateRequest from "../../middlewares/validateRequest";
import { referralValidation } from "./referral.validation";

const router = express.Router();

router.post(
  "/create/referral-code",
  auth(),
  referralControllers.createReferralCode
);
router.post(
  "/create-referral",
  auth(),
  validateRequest(referralValidation.createReferralValidation),
  referralControllers.createReferral
);
router.post(
  "/create-review/:referralId",
  auth(),
  validateRequest(referralValidation.createReviewValidation),
  referralControllers.createReview
);
router.get("/my-referral", auth(), referralControllers.myReferrals);
router.get("/my-services", auth(), referralControllers.myServices);
router.get("/my-subscriptions", auth(), referralControllers.mySubscriptions);
router.get("/:referralId", auth(), referralControllers.referralDetails);
router.patch(
  "/create-offer/:referralId",
  auth(),
  referralControllers.createOffer
);
router.patch("/:referralId", auth(), referralControllers.updateReferralStatus);
router.get("/my-refer/info", auth(), referralControllers.myReferInfo);
router.get("/reviews/my-reviews", auth(), referralControllers.myReviews);

export const referralRoutes = router;
