import { Request } from "express";
import ApiError from "../../../errors/ApiErrors";
import { paginationHelper } from "../../../shared/pagination";
import prisma from "../../../shared/prisma";
import { userSearch } from "../../../shared/userSearch";

const sendRequest = async (senderId: string, receiverId: string) => {
  if (senderId === receiverId) {
    throw new ApiError(409, "You cannot send request to own");
  }
  const isExisting = await prisma.connection.findUnique({
    where: {
      senderId_receiverId: {
        senderId: senderId,
        receiverId: receiverId,
      },
    },
  });
  if (isExisting) {
    throw new ApiError(409, "Connection request already exists.");
  }

  const connection = await prisma.connection.create({
    data: {
      senderId,
      receiverId,
    },
  });
  return connection;
};

const acceptConnection = async (connectionId: string, userId: string) => {
  const isConnection = await prisma.connection.findUnique({
    where: {
      id: connectionId,
      receiverId: userId,
    },
  });

  if (!isConnection) {
    throw new ApiError(404, "Connection request not found");
  }

  const result = await prisma.connection.update({
    where: {
      id: connectionId,
    },
    data: {
      status: "ACCEPTED",
    },
  });

  return result;
};

const ignoreConnection = async (connectionId: string, userId: string) => {
  const isConnection = await prisma.connection.findUnique({
    where: {
      id: connectionId,
      receiverId: userId,
    },
  });

  if (!isConnection) {
    throw new ApiError(404, "Connection request not found");
  }

  const result = await prisma.connection.delete({
    where: {
      id: connectionId,
    },
  });

  return result;
};

const cancelConnection = async (connectionId: string, userId: string) => {
  const isConnection = await prisma.connection.findUnique({
    where: {
      id: connectionId,
      senderId: userId,
    },
  });

  if (!isConnection) {
    throw new ApiError(404, "Connection request not found");
  }

  const result = await prisma.connection.delete({
    where: {
      id: connectionId,
    },
  });

  return result;
};

const getReceivedRequests = async (req: Request) => {
  const userId = req.user.id;
  const { page, limit, take, skip } = paginationHelper(req.query as any);
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      referralCode: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const connections = await prisma.connection.findMany({
    where: {
      receiverId: userId,
      status: "PENDING",
    },
    select: {
      id: true,
      sender: {
        select: {
          id: true,
          profileImage: true,
          username: true,
          email: true,
          designation: true,
        },
      },
    },
    skip,
    take,
  });

  const totalCount = await prisma.connection.count({
    where: {
      receiverId: userId,
      status: "PENDING",
    },
  });

  const totalPages = Math.ceil(totalCount / limit);

  const enrichedConnections = await Promise.all(
    connections.map(async (conn) => {
      const referralCount = await prisma.referral.count({
        where: {
          referrerId: conn.sender?.id,
          referStatus: "COMPLETED",
        },
      });

      return {
        id: conn.id,
        sender: {
          ...conn.sender,
          referralCount,
        },
      };
    })
  );

  return {
    totalCount,
    totalPages,
    currentPage: page,
    connectionRequest: enrichedConnections,
  };
};

const myConnections = async (req: Request, userId: string) => {
  const { page, limit, take, skip, search } = paginationHelper(
    req.query as any
  );

  const baseWhere = {
    OR: [{ senderId: userId }, { receiverId: userId }],
    status: "ACCEPTED" as const,
  };

  const connections = await prisma.connection.findMany({
    where: baseWhere,
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      sender: {
        select: {
          id: true,
          username: true,
          uniqueId: true,
          designation: true,
          profileImage: true,
        },
      },
      receiver: {
        select: {
          id: true,
          username: true,
          uniqueId: true,
          designation: true,
          profileImage: true,
        },
      },
    },
    skip,
    take,
  });

  // Filter results after fetching based on search
  const filtered = await Promise.all(
    connections.map(async (conn) => {
      const isSender = conn.senderId === userId;
      const userInfo = isSender ? conn.receiver : conn.sender;

      const matchesSearch =
        !search ||
        userInfo?.uniqueId?.toLowerCase().includes(search.toLowerCase()) ||
        userInfo?.designation?.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return null;

      const referralCount = await prisma.referral.count({
        where: {
          referrerId: userInfo?.id,
          referStatus: "COMPLETED",
        },
      });

      return {
        ...userInfo,
        referralCount,
        connectionId: conn.id,
      };
    })
  );

  const results = filtered.filter(Boolean);

  return {
    totalCount: results.length,
    totalPages: Math.ceil(results.length / limit),
    currentPage: page,
    connections: results,
  };
};

const userConnections = async (req: Request, userId: string, myId: string) => {
  const { page, limit, take, skip, search } = paginationHelper(
    req.query as any
  );

  const baseWhere = {
    OR: [{ senderId: userId }, { receiverId: userId }],
    status: "ACCEPTED" as const,
  };

  const connections = await prisma.connection.findMany({
    where: baseWhere,
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      status: true,
      sender: {
        select: {
          id: true,
          username: true,
          uniqueId: true,
          designation: true,
          profileImage: true,
        },
      },
      receiver: {
        select: {
          id: true,
          username: true,
          uniqueId: true,
          designation: true,
          profileImage: true,
        },
      },
    },
    skip,
    take,
  });

  const filtered = await Promise.all(
    connections.map(async (conn) => {
      const isSender = conn.senderId === userId;
      const userInfo = isSender ? conn.receiver : conn.sender;

      const matchesSearch =
        !search ||
        userInfo?.uniqueId?.toLowerCase().includes(search.toLowerCase()) ||
        userInfo?.designation?.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return null;

      const referralCount = await prisma.referral.count({
        where: {
          referrerId: userInfo?.id,
          referStatus: "COMPLETED",
        },
      });

      // 🔍 Find connection status between myId and userInfo.id
      const connectionBetween = await prisma.connection.findFirst({
        where: {
          OR: [
            { senderId: myId, receiverId: userInfo?.id },
            { senderId: userInfo?.id, receiverId: myId },
          ],
        },
        select: {
          status: true,
        },
      });

      return {
        ...userInfo,
        referralCount,
        connectionId: conn.id,
        connectionStatus: connectionBetween?.status ?? null,
      };
    })
  );

  const results = filtered.filter(Boolean);

  return {
    totalCount: results.length,
    totalPages: Math.ceil(results.length / limit),
    currentPage: page,
    connections: results,
  };
};

const contactProfile = async (senderId: string, userId: string) => {
  const userInfo = await prisma.user.findUnique({
    where: {
      id: senderId,
    },
    select: {
      id: true,
      profileImage: true,
      username: true,
      uniqueId: true,
      designation: true,
      bio: true,
      referrerStatus: true,
    },
  });
  if (!userInfo) {
    throw new ApiError(404, "user not found");
  }

  const mySubscription = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      subscription: {
        select: {
          priceId: true,
        },
      },
    },
  });
  const connection = await prisma.connection.findFirst({
    where: {
      OR: [
        {
          senderId: senderId,
          receiverId: userId,
        },
        {
          senderId: userId,
          receiverId: senderId,
        },
      ],
    },
  });

  const connections = await prisma.connection.count({
    where: {
      OR: [
        {
          senderId: senderId,
        },
        {
          receiverId: senderId,
        },
      ],
    },
  });

  const referralCount = await prisma.referral.count({
    where: {
      referrerId: senderId,
      referStatus: "COMPLETED",
    },
  });

  const averageRating = await prisma.review.aggregate({
    where: {
      OR: [{ providerId: senderId }, { referrerId: senderId }],
    },
    _avg: {
      rating: true,
    },
  });

  let plans;
  let isSubscribed = false;

  if (userInfo.referrerStatus === "SUPER") {
    plans = await prisma.plan.findMany({
      where: {
        userId: senderId,
      },
      select: {
        id: true,
        planName: true,
        amount: true,
        intervalCount: true,
        discount: true,
        priceId: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (Array.isArray(mySubscription?.subscription)) {
      const subscribedPriceIds = mySubscription.subscription.map(
        (sub) => sub.priceId
      );
      isSubscribed = plans.some((plan: any) =>
        subscribedPriceIds.includes(plan.priceId)
      );
    }
  }

  return {
    ...userInfo,
    referralCount,
    averageRating: averageRating._avg.rating ?? 0,
    connectionId: connection?.id ? connection?.id : null,
    connectionStatus: connection?.status ? connection?.status : "PENDING",
    connections,
    plans: plans ?? [],
    isSubscribed,
  };
};

const recommendationContacts = async (req: Request) => {
  const { page, limit, take, skip, search } = paginationHelper(
    req.query as any
  );
  const authUserId = (req as any).user?.id; // Assumes middleware sets req.user

  if (!authUserId) {
    throw new ApiError(401, "Unauthorized access");
  }

  const searchFilter: any = search ? userSearch(search) : {};

  // Step 1: Get all connected user IDs
  const connections = await prisma.connection.findMany({
    where: {
      OR: [{ senderId: authUserId }, { receiverId: authUserId }],
    },
    select: {
      senderId: true,
      receiverId: true,
    },
  });

  // Extract all connected user IDs (excluding self)
  const connectedUserIds = new Set<string>();
  connections.forEach(({ senderId, receiverId }) => {
    if (senderId && senderId !== authUserId) connectedUserIds.add(senderId);
    if (receiverId && receiverId !== authUserId)
      connectedUserIds.add(receiverId);
  });

  // Step 2: Fetch users NOT connected
  const users = await prisma.user.findMany({
    where: {
      AND: [
        searchFilter,
        {
          id: {
            not: authUserId, // Exclude self
            notIn: Array.from(connectedUserIds), // Exclude connected users
          },
        },
      ],
    },
    select: {
      id: true,
      profileImage: true,
      username: true,
      designation: true,
    },
    skip,
    take,
  });

  const totalCount = await prisma.user.count({
    where: {
      AND: [
        searchFilter,
        {
          id: {
            not: authUserId,
            notIn: Array.from(connectedUserIds),
          },
        },
      ],
    },
  });

  // Step 3: Add referral count per user
  const results = await Promise.all(
    users.map(async (user) => {
      const referralCount = await prisma.referral.count({
        where: {
          referrerId: user.id,
          referStatus: "COMPLETED",
        },
      });

      return {
        ...user,
        referralCount,
      };
    })
  );

  return {
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    users: results,
  };
};

const sentRequests = async (userId: string) => {
  // Fetch all pending requests sent by the user
  const requests = await prisma.connection.findMany({
    where: {
      senderId: userId,
      status: "PENDING",
    },
    select: {
      id: true,
      receiver: {
        select: {
          id: true,
          profileImage: true,
          username: true,
          designation: true,
        },
      },
    },
  });

  if (requests.length === 0) {
    throw new ApiError(404, "Pending requests not found");
  }

  // Build result with referral count for each receiver
  const results = await Promise.all(
    requests.map(async (req) => {
      const receiver = req.receiver;
      const connectionId = req.id;

      const referralCount = await prisma.referral.count({
        where: {
          referrerId: receiver?.id,
          referStatus: "COMPLETED",
        },
      });

      return {
        ...receiver,
        connectionId,
        referralCount,
      };
    })
  );

  return results;
};

const inviteMembers = async (
  req: Request,
  userId: string,
  communityId: string
) => {
  const { page, limit, take, skip, search } = paginationHelper(
    req.query as any
  );

  const baseWhere = {
    OR: [{ senderId: userId }, { receiverId: userId }],
    status: "ACCEPTED" as const,
  };

  const connections = await prisma.connection.findMany({
    where: baseWhere,
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      sender: {
        select: {
          id: true,
          username: true,
          uniqueId: true,
          designation: true,
          profileImage: true,
        },
      },
      receiver: {
        select: {
          id: true,
          username: true,
          uniqueId: true,
          designation: true,
          profileImage: true,
        },
      },
    },
    skip,
    take,
  });

  const filtered = await Promise.all(
    connections.map(async (conn) => {
      const isSender = conn.senderId === userId;
      const userInfo = isSender ? conn.receiver : conn.sender;

      const matchesSearch =
        !search ||
        userInfo?.uniqueId?.toLowerCase().includes(search.toLowerCase()) ||
        userInfo?.designation?.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return null;

      // ✅ Check if user is already joined
      const alreadyJoined = await prisma.joinCommunity.findFirst({
        where: {
          userId: userInfo?.id,
          communityId,
        },
        select: { id: true },
      });

      let status = "Invite";

      if (alreadyJoined) {
        status = "Already Joined";
      } else {
        const isInvited = await prisma.inviteCommunity.findUnique({
          where: {
            communityId_inviterId: {
              communityId,
              inviterId: userInfo?.id as string,
            },
          },
          select: { id: true },
        });

        if (isInvited) {
          status = "Invited";
        }
      }

      const referralCount = await prisma.referral.count({
        where: {
          referrerId: userInfo?.id,
          referStatus: "COMPLETED",
        },
      });

      return {
        ...userInfo,
        referralCount,
        connectionId: conn.id,
        status, // "Already Joined", "Invited", or "Invite"
      };
    })
  );

  const results = filtered.filter(Boolean);

  return {
    totalCount: results.length,
    totalPages: Math.ceil(results.length / limit),
    currentPage: page,
    connections: results,
  };
};

export const connectionServices = {
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
