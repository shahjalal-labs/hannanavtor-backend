import { Request } from "express";
import ApiError from "../../../errors/ApiErrors";
import admin from "../../../helpers/firebaseAdmin";
import { paginationHelper } from "../../../shared/pagination";
import prisma from "../../../shared/prisma";

interface NotificationPayload {
  userId: string;
  fcmToken: string;
  title: string;
  body: string;
  referrerId: string;
  providerId: string;
  clientId: string;
}

// Send notification to a single user
export const sendSingleNotification = async (
  userId: string,
  title: string,
  body: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "user not found");
  }

  const message = {
    notification: {
      title: title,
      body: body,
    },
    token: user.fcmToken,
  };

  await prisma.notification.create({
    data: {
      userId,
      title,
      body,
    },
  });

  try {
    await admin.messaging().send(message);
    return;
  } catch (error: any) {
    console.log("error");
  }
};

export const sendMultipleNotifications = async (
  notifications: NotificationPayload[]
) => {
  for (const notif of notifications) {
    const { userId, fcmToken, title, body } = notif;

    const message = {
      notification: {
        title,
        body,
      },
      token: fcmToken,
    };

    try {
      const response = await admin.messaging().send(message);
      console.log(`Notification sent to ${userId}`, response);
    } catch (error: any) {
      console.error(`Failed to send notification to ${userId}:`, error.message);

      if (error.code === "messaging/invalid-registration-token") {
        throw new ApiError(400, `Invalid FCM token for user ${userId}`);
      } else if (error.code === "messaging/registration-token-not-registered") {
        throw new ApiError(404, `FCM token not registered for user ${userId}`);
      }
    }
  }
};

const getNotificationsFromDB = async (req: Request) => {
  const userId = req.user.id;
  const { page, limit, take, skip } = paginationHelper(req.query as any);
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  const totalCount = await prisma.notification.count({
    where: { userId },
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    totalCount,
    totalPages,
    currentPage: page,
    notifications,
  };
};

const getSingleNotificationFromDB = async (notificationId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found for the user");
  }

  const updateNotification = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return updateNotification;
};

export const notificationServices = {
  getNotificationsFromDB,
  getSingleNotificationFromDB,
};
