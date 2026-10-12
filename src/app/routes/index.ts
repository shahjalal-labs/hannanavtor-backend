import express from "express";
import { userRoutes } from "../modules/user/user.route";
import { authRoute } from "../modules/auth/auth.routes";
import { connectionRoutes } from "../modules/connection/connection.routes";
import { referralRoutes } from "../modules/referral/referral.routes";
import { paymentRoutes } from "../modules/payment/payment.routes";
import { notificationsRoute } from "../modules/notifications/notification.route";
import { messageRoute } from "../modules/message/message.routes";
import { communityRoutes } from "../modules/community/community.routes";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/connections",
    route: connectionRoutes,
  },
  {
    path: "/referrals",
    route: referralRoutes,
  },
  {
    path: "/payments",
    route: paymentRoutes,
  },
  {
    path: "/notifications",
    route: notificationsRoute,
  },
  {
    path: "/messages",
    route: messageRoute,
  },
  {
    path: "/community",
    route: communityRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
