import { Referral, ReferStatus, Review } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { paginationHelper } from "../../../shared/pagination";
import { Request } from "express";
import { sendSingleNotification } from "../notifications/notification.services";
import stripe from "../../../config/stripe";

const createReferralCode = async (userId: string, usedReferralCode: string) => {
  await prisma.$transaction(async (tx) => {
    // Check if user exists
    const user = await tx.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    // Check if user has already used a referral code
    if (user.usedReferralCodeStatus) {
      throw new ApiError(400, "You have already used a referral code.");
    }

    // Check if referral code exists and is not the user's own code
    const referredUser = await tx.user.findUnique({
      where: { referralCode: usedReferralCode },
    });
    if (!referredUser) {
      throw new ApiError(404, "Invalid referral code.");
    }

    if (referredUser.id === userId) {
      throw new ApiError(400, "You cannot use your own referral code.");
    }

    // Create referral record
    await tx.referralCode.create({
      data: {
        userId,
        usedReferralCode,
      },
    });

    // Update user's referral code usage status
    await tx.user.update({
      where: { id: userId },
      data: {
        usedReferralCodeStatus: true,
      },
    });
  });
  return;
};

const createReferral = async (userId: string, payload: Referral) => {
  const result = await prisma.referral.create({
    data: {
      ...payload,
      referrerId: userId,
    },
  });

  return result;
};

const myReferrals = async (req: Request) => {
  const userId = req.user.id;
  const { page, limit, skip, take } = paginationHelper(req.query as any);
  const references = await prisma.referral.findMany({
    where: {
      referrerId: userId,
    },
    select: {
      id: true,
      serviceType: true,
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
      purpose: true,
      referStatus: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  const totalCount = await prisma.referral.count({
    where: {
      referrerId: userId,
    },
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    totalCount,
    totalPages,
    currentPage: page,
    references,
  };
};

const myServices = async (req: Request) => {
  const userId = req.user.id;
  const { page, limit, skip, take } = paginationHelper(req.query as any);
  const references = await prisma.referral.findMany({
    where: {
      providerId: userId,
    },
    select: {
      id: true,
      serviceType: true,
      referrer: {
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
      purpose: true,
      referStatus: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  const totalCount = await prisma.referral.count({
    where: {
      providerId: userId,
    },
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    totalCount,
    totalPages,
    currentPage: page,
    references,
  };
};

const mySubscriptions = async (req: Request) => {
  const userId = req.user.id;
  const { page, limit, skip, take } = paginationHelper(req.query as any);
  const references = await prisma.referral.findMany({
    where: {
      clientId: userId,
      NOT: {
        OR: [{ referStatus: "PENDING" }, { referStatus: "PROVIDER_REJECTED" }],
      },
    },
    select: {
      id: true,
      serviceType: true,
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
      purpose: true,
      referStatus: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  const totalCount = await prisma.referral.count({
    where: {
      clientId: userId,
    },
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    totalCount,
    totalPages,
    currentPage: page,
    references,
  };
};

const createReview = async (
  referralId: string,
  clientId: string,
  payload: Review
) => {
  return await prisma.$transaction(async (tx) => {
    // 1️⃣ Check referral existence
    const referral = await tx.referral.findUnique({
      where: { id: referralId },
    });

    if (!referral) {
      throw new ApiError(404, "Referral Not Found");
    }

    // 2️⃣ Check if review already exists
    const isExistReview = await tx.review.findFirst({
      where: { referralId },
    });

    if (isExistReview) {
      throw new ApiError(409, "Already given review");
    }

    // 3️⃣ Create Review
    const review = await tx.review.create({
      data: {
        ...payload,
        referralId,
        clientId,
        referrerId: referral.referrerId,
        providerId: referral.providerId,
      },
    });

    // 4️⃣ Update Referrer Stats
    const updatedReferrer = await tx.user.update({
      where: { id: referral.referrerId },
      data: {
        totalReviews: { increment: 1 },
        totalRating: { increment: payload.rating },
      },
    });

    await tx.user.update({
      where: { id: referral.referrerId },
      data: {
        averageRating:
          updatedReferrer.totalRating / updatedReferrer.totalReviews,
      },
    });

    // 5️⃣ Update Provider Stats
    const updatedProvider = await tx.user.update({
      where: { id: referral.providerId },
      data: {
        totalReviews: { increment: 1 },
        totalRating: { increment: payload.rating },
      },
    });

    await tx.user.update({
      where: { id: referral.providerId },
      data: {
        averageRating:
          updatedProvider.totalRating / updatedProvider.totalReviews,
      },
    });

    return review;
  });
};

const referralDetails = async (referralId: string) => {
  const referral = await prisma.referral.findUnique({
    where: {
      id: referralId,
    },
    select: {
      id: true,
      serviceType: true,
      purpose: true,
      commitions: true,
      validity: true,
      description: true,
      amount: true,
      referrer: {
        select: {
          id: true,
          username: true,
          profileImage: true,
          designation: true,
        },
      },
      provider: {
        select: {
          id: true,
          username: true,
          profileImage: true,
          designation: true,
        },
      },
      client: {
        select: {
          id: true,
          username: true,
          profileImage: true,
          designation: true,
        },
      },
      referStatus: true,
      createdAt: true,
    },
  });

  if (!referral) {
    throw new ApiError(404, "Referral Not Found!");
  }
  return referral;
};

const createOffer = async (
  referralId: string,
  userId: string,
  payload: Referral
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(404, "user not found");
  }

  const existOffer = await prisma.referral.findUnique({
    where: { id: referralId, providerId: userId },
  });
  if (!existOffer) {
    throw new ApiError(404, "Only provider can create a offer");
  }

  if (existOffer.referStatus === "CLIENT_ACCEPTED") {
    throw new ApiError(
      409,
      "Offer already created, you cannot again create this offer"
    );
  }

  const result = await prisma.referral.update({
    where: { id: referralId, providerId: userId },
    data: {
      amount: payload.amount,
      commitions: payload.commitions,
      description: payload.description,
      validity: payload.validity,
    },
  });

  return result;
};

const updateReferralStatus = async (
  referralId: string,
  userId: string,
  status: ReferStatus
) => {
  const referralInfo = await prisma.referral.findFirst({
    where: {
      id: referralId,
      OR: [
        { referrerId: userId },
        { providerId: userId },
        { clientId: userId },
      ],
    },
  });
  if (!referralInfo) {
    throw new ApiError(404, "You are not involved in this referral");
  }

  const isProvider = userId === referralInfo.providerId;
  const isClient = userId === referralInfo.clientId;
  const currentStatus = referralInfo.referStatus;

  const canProviderUpdate =
    isProvider &&
    (currentStatus === ReferStatus.PENDING ||
      currentStatus === ReferStatus.CLIENT_ACCEPTED);

  const canClientUpdate = isClient && currentStatus !== ReferStatus.PENDING;

  if (!canProviderUpdate && !canClientUpdate) {
    throw new ApiError(400, "You cannot perform this action");
  }

  switch (status) {
    case ReferStatus.PROVIDER_ACCEPTED:
      console.log("provider accepted the request");
      await sendSingleNotification(
        referralInfo.referrerId,
        "provider accepted the request",
        `Provider has accepted the ${referralInfo.purpose} referral request and will proceed accordingly.`
      );
      await sendSingleNotification(
        referralInfo.providerId,
        "You accept a referral request",
        `You accept a request of ${referralInfo.purpose}`
      );
      await sendSingleNotification(
        referralInfo.clientId,
        "Provider send a request",
        `Provider send to you a request for ${referralInfo.purpose}`
      );
      break;
    case ReferStatus.PROVIDER_REJECTED:
      console.log("provider rejected the request");
      await sendSingleNotification(
        referralInfo.referrerId,
        "Provider rejected the request",
        `The provider has rejected the ${referralInfo.purpose} referral request.`
      );
      await sendSingleNotification(
        referralInfo.providerId,
        "You rejected a referral request",
        `You have rejected the ${referralInfo.purpose} referral request.`
      );
      await sendSingleNotification(
        referralInfo.clientId,
        "Provider rejected your request",
        `The provider has rejected your ${referralInfo.purpose} referral request.`
      );
      break;
    case ReferStatus.CLIENT_ACCEPTED:
      console.log("client accepted the request");
      const [client] = await Promise.all([
        prisma.user.findUnique({ where: { id: referralInfo.clientId } }),
      ]);

      const totalAmounts = referralInfo.amount;

      const clientInfo = await prisma.user.findUnique({
        where: {
          id: client?.id,
        },
      });

      if (!clientInfo) {
        throw new ApiError(404, "You are not in the platform");
      }

      if (clientInfo?.balance < totalAmounts) {
        throw new ApiError(400, "You have insufficient amount in your balance");
      }

      await prisma.user.update({
        where: {
          id: client?.id,
        },
        data: {
          balance: {
            decrement: totalAmounts,
          },
        },
      }),
        await sendSingleNotification(
          referralInfo.referrerId,
          "Client accepted the referral",
          `The client has accepted the ${referralInfo.purpose} referral request.`
        );
      await sendSingleNotification(
        referralInfo.providerId,
        "Client accepted your referral",
        `The client has accepted your ${referralInfo.purpose} referral.`
      );
      await sendSingleNotification(
        referralInfo.clientId,
        "You accepted the referral",
        `You have accepted the ${referralInfo.purpose} referral.`
      );
      break;
    case ReferStatus.DELIVERED:
      console.log("provider delivered the request");
      await sendSingleNotification(
        referralInfo.referrerId,
        "Provider delivered the referral",
        `The provider has successfully delivered the ${referralInfo.purpose} referral.`
      );
      await sendSingleNotification(
        referralInfo.providerId,
        "You delivered the referral",
        `You have delivered the ${referralInfo.purpose} referral.`
      );
      await sendSingleNotification(
        referralInfo.clientId,
        "Referral has been delivered",
        `The provider has delivered your ${referralInfo.purpose} referral. Please review it.`
      );
      break;
    case ReferStatus.CLIENT_REJECTED:
      console.log("client rejected the request");
      await sendSingleNotification(
        referralInfo.referrerId,
        "Client rejected the referral",
        `The client has rejected the ${referralInfo.purpose} referral request.`
      );
      await sendSingleNotification(
        referralInfo.providerId,
        "Client rejected your referral",
        `The client has rejected your ${referralInfo.purpose} referral.`
      );
      await sendSingleNotification(
        referralInfo.clientId,
        "You rejected the referral",
        `You have rejected the ${referralInfo.purpose} referral.`
      );
      break;
    case ReferStatus.COMPLETED:
      console.log("client completed the request");
      const totalAmount = referralInfo.amount;

      const [referrer, provider] = await Promise.all([
        prisma.user.findUnique({ where: { id: referralInfo.referrerId } }),
        prisma.user.findUnique({ where: { id: referralInfo.providerId } }),
      ]);

      const referrerAmount = (totalAmount * referralInfo.commitions) / 100;
      const adminAmount = totalAmount * 0.2;
      const providerAmount = totalAmount - (referrerAmount + adminAmount);

      await Promise.all([
        stripe.transfers.create({
          currency: "usd",
          amount: referrerAmount * 100,
          destination: referrer?.accountId as string,
        }),
        stripe.transfers.create({
          currency: "usd",
          amount: providerAmount * 100,
          destination: provider?.accountId as string,
        }),
      ]);

      await sendSingleNotification(
        referralInfo.referrerId,
        "Referral marked as completed",
        `The client has marked the ${referralInfo.purpose} referral as completed.`
      );
      await sendSingleNotification(
        referralInfo.providerId,
        "Referral successfully completed",
        `The client has completed the ${referralInfo.purpose} referral you worked on.`
      );
      await sendSingleNotification(
        referralInfo.clientId,
        "You completed the referral",
        `You have successfully completed the ${referralInfo.purpose} referral.`
      );
      break;
    case ReferStatus.DISPUTE:
      console.log("client disputed the request");
      await sendSingleNotification(
        referralInfo.referrerId,
        "Client raised a dispute",
        `The client has raised a dispute regarding the ${referralInfo.purpose} referral.`
      );
      await sendSingleNotification(
        referralInfo.providerId,
        "Dispute raised on referral",
        `The client has raised a dispute for your ${referralInfo.purpose} referral. Please review and respond.`
      );
      await sendSingleNotification(
        referralInfo.clientId,
        "You raised a dispute",
        `You have raised a dispute for the ${referralInfo.purpose} referral. Our team will review it shortly.`
      );
    default:
      console.log("unknown status");
  }
  console.log("working");

  const result = await prisma.referral.update({
    where: { id: referralId },
    data: { referStatus: status },
  });

  return result;
};

const myReferInfo = async (userId: string) => {
  const [userInfo, referralsSummary] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
      },
    }),

    prisma.referral.groupBy({
      by: ["referStatus"],
      where: {
        referrerId: userId,
      },
      _count: true,
      _sum: {
        amount: true,
      },
    }),
  ]);

  let pendingReferral = 0;
  let completedReferral = 0;
  let totalEarning = 0;

  referralsSummary.forEach((group) => {
    if (group.referStatus === "PENDING") {
      pendingReferral = group._count;
    } else if (group.referStatus === "COMPLETED") {
      completedReferral = group._count;
      totalEarning = group._sum.amount || 0;
    }
  });

  return {
    user: userInfo,
    pendingReferral,
    completedReferral,
    totalEarning,
  };
};

// const myReviews = async (userId: string, orderBy: string, rating?: string) => {
//   const filters: any = {
//     OR: [{ referrerId: userId }, { providerId: userId }],
//   };
//   if (rating) {
//     const provideRating = parseInt(rating);
//     filters.OR = [
//       { referrerId: userId, rating: provideRating },
//       { providerId: userId, rating: provideRating },
//     ];
//   }
//   const reviews = await prisma.review.findMany({
//     where: filters,
//     select: {
//       id: true,
//       rating: true,
//       comment: true,
//       client: {
//         select: {
//           id: true,
//           username: true,
//         },
//       },
//     },
//     orderBy: {
//       createdAt: orderBy === "asc" ? "asc" : "desc",
//     },
//   });
//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//     select: {
//       totalReviews: true,
//       totalRating: true,
//       averageRating: true,
//     },
//   });
//   return {
//     reviews,
//     totalReviews: user?.totalReviews ?? 0,
//     totalRating: user?.totalRating ?? 0,
//     averageRating: user?.averageRating ?? 0,
//   };
// };

const myReviews = async (userId: string, orderBy: string, rating?: string) => {
  const filters: any = {
    OR: [{ referrerId: userId }, { providerId: userId }],
  };

  // Only add rating filter if provided
  let reviewFilters = { ...filters };
  if (rating) {
    const provideRating = parseInt(rating);
    reviewFilters = {
      OR: [
        { referrerId: userId, rating: provideRating },
        { providerId: userId, rating: provideRating },
      ],
    };
  }

  const reviews = await prisma.review.findMany({
    where: reviewFilters,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      client: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: orderBy === "asc" ? "asc" : "desc",
    },
  });

  // Get user totals
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totalReviews: true,
      totalRating: true,
      averageRating: true,
    },
  });

  // Count for each star level
  const [star5, star4, star3, star2, star1] = await Promise.all([
    prisma.review.count({
      where: {
        OR: [{ referrerId: userId }, { providerId: userId }],
        rating: 5,
      },
    }),
    prisma.review.count({
      where: {
        OR: [{ referrerId: userId }, { providerId: userId }],
        rating: 4,
      },
    }),
    prisma.review.count({
      where: {
        OR: [{ referrerId: userId }, { providerId: userId }],
        rating: 3,
      },
    }),
    prisma.review.count({
      where: {
        OR: [{ referrerId: userId }, { providerId: userId }],
        rating: 2,
      },
    }),
    prisma.review.count({
      where: {
        OR: [{ referrerId: userId }, { providerId: userId }],
        rating: 1,
      },
    }),
  ]);

  return {
    reviews,
    totalReviews: user?.totalReviews ?? 0,
    totalRating: user?.totalRating ?? 0,
    averageRating: user?.averageRating ?? 0,
    starCounts: {
      star5,
      star4,
      star3,
      star2,
      star1,
    },
  };
};

export const referralServices = {
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
