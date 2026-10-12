import prisma from "../../../shared/prisma";
import { Request } from "express";
import { uploadInSpace } from "../../../shared/uploadInSpace";
import { paginationHelper } from "../../../shared/pagination";
import config from "../../../config";
import { RtcRole, RtcTokenBuilder } from "agora-access-token";

const appID = config.agora.app_id as string;
const appCertificate = config.agora.app_certificate as string;

const myRoomsFromDB = async (req: Request) => {
  const userId = req.user.id;
  const { page, take, skip } = paginationHelper(req.query as any);
  const rooms = await prisma.room.findMany({
    where: {
      OR: [
        { referrerId: userId },
        { providerId: userId },
        { clientId: userId },
      ],
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      referral: {
        select: {
          purpose: true,
        },
      },
      message: {
        select: { message: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      referrer: {
        select: {
          id: true,
          username: true,
          profileImage: true,
        },
      },
      provider: {
        select: {
          id: true,
          username: true,
          profileImage: true,
        },
      },
      client: {
        select: {
          id: true,
          username: true,
          profileImage: true,
        },
      },
    },
    skip,
    take,
  });

  const totalCount = await prisma.room.count({
    where: {
      OR: [
        { referrerId: userId },
        { providerId: userId },
        { clientId: userId },
      ],
    },
  });

  return {
    totalPages: Math.ceil(totalCount / take),
    currentPage: page,
    totalCount,
    rooms: rooms.map((room) => ({
      id: room.id,
      referralId: room.referralId,
      purpose: room.referral.purpose,
      lastUpdate: room.updatedAt,
      lastMessage: room.message[0],
      referrer: room.referrer,
      provider: room.provider,
      client: room.client,
    })),
  };
};

const urlGenerate = async (req: Request) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const processImages = async (files?: Express.Multer.File[]) => {
    if (!files || files.length === 0) return null;
    return Promise.all(
      files.map((file) => uploadInSpace(file, "messages/files"))
    );
  };

  const [fileUrl] = await Promise.all([processImages(files["fileUrl"])]);

  return fileUrl;
};

const generateAccessTokenInAgora = async (payload: {
  role: "publisher" | "subscriber";
  roomId: string;
  uid: number;
}) => {
  const { role, roomId, uid } = payload;
  const channelName = roomId;

  const expirationTimeInSeconds = 3600; // Token valid for 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTimestamp + expirationTimeInSeconds;

  const agoraRole =
    role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appID,
    appCertificate,
    channelName,
    uid,
    agoraRole,
    privilegeExpireTime
  );

  return token;
};

export const messageService = {
  myRoomsFromDB,
  urlGenerate,
  generateAccessTokenInAgora,
};
