import { Request } from "express";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { uploadInSpace } from "../../../shared/uploadInSpace";
import { paginationHelper } from "../../../shared/pagination";
import { CommunityPost } from "@prisma/client";

const createCommunity = async (req: Request) => {
  const userId = req.user.id;
  const file = req.file as Express.Multer.File;
  const payload = req.body;
  const userInfo = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!userInfo) {
    throw new ApiError(404, "User not found");
  }

  const referralCount = await prisma.referral.count({
    where: {
      referrerId: userId,
    },
  });

  // if (referralCount <= 1) {
  //   throw new ApiError(403, "You cannot access create a community");
  // }

  const communityPhoto = await uploadInSpace(file, "/community");

  const community = await prisma.community.create({
    data: {
      ...payload,
      ambassadorId: userId,
      communityPhoto,
    },
  });

  await prisma.joinCommunity.create({
    data: {
      userId,
      communityId: community.id,
    },
  });

  return community;
};

const myCommunity = async (userId: string) => {
  const community = await prisma.community.findFirst({
    where: {
      ambassadorId: userId,
    },
    include: {
      _count: {
        select: {
          joinCommunity: true,
          referral: true,
        },
      },
    },
  });

  if (!community) {
    throw new ApiError(404, "Your community not found!");
  }

  return community;
};

const joinedCommunities = async (req: Request) => {
  const userId = req.user.id;
  const { page, limit, take, skip } = paginationHelper(req.query as any);
  const communities = await prisma.joinCommunity.findMany({
    where: {
      userId,
      NOT: {
        community: {
          ambassadorId: userId,
        },
      },
    },

    select: {
      community: {
        select: {
          id: true,
          communityPhoto: true,
          communityName: true,
          updatedAt: true,
        },
      },
    },
    orderBy: {
      community: {
        updatedAt: "desc",
      },
    },
    skip,
    take,
  });

  const totalCount = await prisma.joinCommunity.count({
    where: {
      userId,
    },
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    totalCount,
    totalPages,
    currentPage: page,
    communities,
  };
};

const suggestedCommunity = async (userId: string) => {
  const communities = await prisma.community.aggregateRaw({
    pipeline: [
      {
        $lookup: {
          from: "join_communities",
          localField: "_id",
          foreignField: "communityId",
          as: "joinedUsers",
        },
      },
      {
        $lookup: {
          from: "referrals",
          localField: "_id",
          foreignField: "communityId",
          as: "referralUsers",
        },
      },
      {
        $addFields: {
          member: { $size: "$joinedUsers" },
          referral: { $size: "$referralUsers" },
          joinedUserIds: {
            $map: {
              input: "$joinedUsers",
              as: "ju",
              in: { $toObjectId: "$$ju.userId" },
            },
          },
        },
      },
      {
        $match: {
          $expr: {
            $not: {
              $in: [{ $toObjectId: userId }, "$joinedUserIds"], // ✅ Correct here
            },
          },
        },
      },
      { $sample: { size: 10 } },
      {
        $project: {
          _id: 1,
          communityName: 1,
          communityPhoto: 1,
          member: 1,
          referral: 1,
          isJoined: {
            $in: [{ $toObjectId: userId }, "$joinedUserIds"],
          },
        },
      },
    ],
  });

  return communities;
};

const joinCommunity = async (userId: string, communityId: string) => {
  const alreadyJoined = await prisma.joinCommunity.findUnique({
    where: {
      userId_communityId: {
        userId,
        communityId,
      },
    },
  });
  if (alreadyJoined) {
    throw new ApiError(409, "You already joined this community");
  }
  await prisma.joinCommunity.create({
    data: {
      userId,
      communityId,
    },
  });
  const isInvite = await prisma.inviteCommunity.findUnique({
    where: {
      communityId_inviterId: {
        communityId,
        inviterId: userId,
      },
    },
  });
  if (isInvite) {
    await prisma.inviteCommunity.delete({
      where: {
        communityId_inviterId: {
          communityId,
          inviterId: userId,
        },
      },
    });
  }
  return;
};

const inviteCommunity = async (
  inviterId: string,
  userId: string,
  communityId: string
) => {
  const isExist = await prisma.inviteCommunity.findUnique({
    where: {
      communityId_inviterId: {
        communityId,
        inviterId,
      },
    },
  });
  if (isExist) {
    throw new ApiError(409, "This connection already invited this community");
  }
  return await prisma.inviteCommunity.create({
    data: {
      inviterId,
      inviteeId: userId,
      communityId,
    },
  });
};

const myInvitations = async (req: Request) => {
  const userId = req.user.id;
  const { page, limit, skip, take } = paginationHelper(req.query as any);
  const invitations = await prisma.inviteCommunity.findMany({
    where: {
      inviterId: userId,
    },
    select: {
      id: true,
      communityInviter: {
        select: {
          id: true,
          profileImage: true,
          username: true,
        },
      },
      community: {
        select: {
          id: true,
          communityName: true,
          _count: {
            select: {
              joinCommunity: true,
              referral: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  const totalCount = await prisma.inviteCommunity.count({
    where: {
      inviterId: userId,
    },
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    totalCount,
    totalPages,
    currentPage: page,
    invitations,
  };
};

const deleteInvitedCommunity = async (invitedId: string) => {
  return await prisma.inviteCommunity.delete({
    where: {
      id: invitedId,
    },
  });
};

const createCommunityPost = async (
  communityId: string,
  userId: string,
  payload: CommunityPost
) => {
  const isPermisson = await prisma.joinCommunity.findUnique({
    where: {
      userId_communityId: {
        userId,
        communityId,
      },
    },
  });

  if (!isPermisson) {
    throw new ApiError(403, "You cannot create a post");
  }

  await prisma.communityPost.create({
    data: {
      ...payload,
      communityId,
      userId,
    },
  });
  await prisma.community.update({
    where: {
      id: communityId,
    },
    data: {
      updatedAt: new Date(),
    },
  });
  return;
};

const communityInfo = async (userId: string, communityId: string) => {
  const isPermisson = await prisma.joinCommunity.findUnique({
    where: {
      userId_communityId: {
        userId,
        communityId,
      },
    },
  });

  if (!isPermisson) {
    throw new ApiError(403, "You permission denied");
  }
  const community = await prisma.community.findUnique({
    where: {
      id: communityId,
    },

    select: {
      id: true,
      communityName: true,
      communityPhoto: true,
      _count: {
        select: {
          joinCommunity: true,
          referral: true,
        },
      },
      joinCommunity: {
        select: {
          user: {
            select: {
              id: true,
              profileImage: true,
            },
          },
        },
      },
      communityPost: {
        select: {
          id: true,
          post: true,
          location: true,
          createdAt: true,
          _count: {
            select: {
              postLike: true,
            },
          },
          postLike: {
            where: {
              userId,
            },
            select: {
              id: true,
            },
          },
          user: {
            select: {
              id: true,
              profileImage: true,
              username: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  const postsWithIsLiked =
    community?.communityPost.map((post) => ({
      ...post,
      isLiked: post.postLike.length > 0,
    })) || [];

  return {
    ...community,
    communityPost: postsWithIsLiked,
  };
};

const communityMembers = async (userId: string, communityId: string) => {
  const isMember = await prisma.joinCommunity.findUnique({
    where: {
      userId_communityId: {
        userId,
        communityId,
      },
    },
  });

  if (!isMember) {
    throw new ApiError(
      403,
      "Permission denied. You are not a member of this community."
    );
  }

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: {
      id: true,
      owner: {
        select: {
          id: true,
          profileImage: true,
          username: true,
          designation: true,
          _count: {
            select: {
              referrer: true,
            },
          },
        },
      },
      joinCommunity: {
        where: {
          NOT: {
            userId: userId,
          },
        },

        select: {
          user: {
            select: {
              id: true,
              profileImage: true,
              username: true,
              designation: true,
              _count: {
                select: {
                  referrer: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!community) return null;

  // Collect member IDs for connection check
  const memberIds = community.joinCommunity.map((jc) => jc.user.id);
  const ownerId = community.owner.id;

  // Fetch all connections between the requesting user and other members
  const connections = await prisma.connection.findMany({
    where: {
      OR: memberIds.flatMap((memberId) => [
        { senderId: userId, receiverId: memberId },
        { senderId: memberId, receiverId: userId },
      ]),
    },
    select: {
      senderId: true,
      receiverId: true,
      status: true,
    },
  });

  const ownerConnection = connections.find(
    (conn) =>
      (conn.senderId === userId && conn.receiverId === ownerId) ||
      (conn.senderId === ownerId && conn.receiverId === userId)
  );

  // Determine the connection status for each member
  const membersWithStatus = community.joinCommunity.map(({ user }) => {
    const connection = connections.find(
      (conn) =>
        (conn.senderId === userId && conn.receiverId === user.id) ||
        (conn.senderId === user.id && conn.receiverId === userId)
    );

    return {
      ...user,
      connectionStatus: connection?.status || null,
    };
  });

  return {
    id: community.id,
    owner: {
      ...community.owner,
      connectionStatus: ownerConnection?.status || null,
    },
    members: membersWithStatus,
  };
};

const likeUnlikePost = async (userId: string, postId: string) => {
  const isLike = await prisma.postLike.findUnique({
    where: {
      userId_postId: {
        userId,
        postId,
      },
    },
  });
  if (isLike) {
    await prisma.postLike.delete({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });
    return "Post unliked has been successfull";
  } else {
    await prisma.postLike.create({
      data: {
        userId,
        postId,
      },
    });
    return "Post liked has been successfull";
  }
};

export const communityServices = {
  createCommunity,
  myCommunity,
  suggestedCommunity,
  joinCommunity,
  inviteCommunity,
  myInvitations,
  deleteInvitedCommunity,
  joinedCommunities,
  createCommunityPost,
  communityInfo,
  communityMembers,
  likeUnlikePost,
};
