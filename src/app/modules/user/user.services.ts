import { User } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import config from "../../../config";
import prisma from "../../../shared/prisma";
import generateOTP from "../../../helpers/generateOtp";
import sendEmail from "../../../helpers/sendEmail";
import { generateUniqueReferralCode } from "../../../helpers/referral";

//create new user
const createUserIntoDB = async (payload: User) => {
  const existingUser = await prisma.user.findFirst({
    where: { email: payload.email },
  });
  if (existingUser) {
    throw new ApiError(409, "email already exist!");
  }

  const hashedPassword = await bcrypt.hash(payload.password as string, 10);

  const userInfo = await prisma.pendingUser.upsert({
    where: { email: payload.email },
    update: {
      email: payload.email,
      username: payload.username,
      password: hashedPassword,
    },
    create: {
      email: payload.email,
      username: payload.username,
      password: hashedPassword,
      fcmToken: payload.fcmToken,
    },
  });

  // Generate OTP and expiry time
  const otp = generateOTP(); // 4-digit OTP
  const OTP_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minute
  const expiresAt = Date.now() + OTP_EXPIRATION_TIME;
  const subject = "Signup Verification";
  const html = `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2>User Signup Verification</h2>
    <p>Hi <b>${userInfo.username}</b>,</p>
    <p>Your Signup Verification Code is:</p>
    <h1 style="color: #007BFF;">${otp}</h1>
    <p>This OTP is valid for <b>5 minutes</b>. If you did not request this, please ignore this email.</p>
    <p>Thanks, <br>The Support Team</p>
  </div>
`;
  await sendEmail(userInfo.email, subject, html);
  await prisma.otp.upsert({
    where: {
      email: userInfo.email,
    },
    update: { otpCode: otp, expiresAt: new Date(expiresAt) },
    create: {
      email: userInfo.email,
      otpCode: otp,
      expiresAt: new Date(expiresAt),
    },
  });

  return;
};

//verify user using otp for signup
const signupVerification = async (payload: { email: string; otp: string }) => {
  const { email, otp } = payload;

  const existUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existUser) {
    throw new ApiError(404, "This Email Already Verified Using OTP");
  }

  const pendingUser = await prisma.pendingUser.findUnique({
    where: { email: email },
  });
  if (!pendingUser) {
    throw new ApiError(404, "Please first sign up");
  }

  const verifyData = await prisma.otp.findUnique({
    where: {
      email: email,
    },
  });

  if (!verifyData) {
    throw new ApiError(400, "Invalid or expired OTP.");
  }

  const { otpCode: savedOtp, expiresAt } = verifyData;

  if (otp !== savedOtp) {
    throw new ApiError(401, "Invalid OTP.");
  }

  if (Date.now() > expiresAt.getTime()) {
    await prisma.otp.delete({
      where: {
        email: email,
      },
    }); // OTP has expired
    throw new ApiError(410, "OTP has expired. Please request a new OTP.");
  }

  const referralCode = await generateUniqueReferralCode();

  const user = await prisma.$transaction(async (tx) => {
    await tx.otp.delete({
      where: { email: email },
    });

    await tx.pendingUser.delete({
      where: { email: email },
    });

    const generateUniqueId = (username: string) => {
      const randomSuffix = Math.random().toString(36).substring(2, 8); // random 6 chars
      return `${username}_${randomSuffix}`;
    };
    const uniqueId = generateUniqueId(pendingUser.username);

    return tx.user.create({
      data: {
        username: pendingUser.username,
        uniqueId,
        email: pendingUser.email,
        password: pendingUser.password,
        referralCode,
        fcmToken: pendingUser.fcmToken,
      },
    });
  });
  if (!user) {
    throw new ApiError(500, "Failed to create user");
  }

  const accessToken = jwtHelpers.generateToken(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string
  );

  return {
    accessToken,
    usedReferralCode: user.usedReferralCodeStatus,
  };
};

//get single user
const getSingleUserIntoDB = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(404, "user not found!");
  }

  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
};

//get all users
const getUsersIntoDB = async () => {
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    throw new ApiError(404, "Users not found!");
  }
  const sanitizedUsers = users.map((user) => {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  });
  return sanitizedUsers;
};

//update user
const updateUserIntoDB = async (id: string, userData: any) => {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid user ID format");
  }
  const existingUser = await getSingleUserIntoDB(id);
  if (!existingUser) {
    throw new ApiError(404, "user not found for edit user");
  }
  const updatedUser = await prisma.user.update({
    where: { id },
    data: userData,
  });

  const { password, ...sanitizedUser } = updatedUser;

  return sanitizedUser;
};

//delete user
const deleteUserIntoDB = async (userId: string, loggedId: string) => {
  if (!ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID format");
  }

  if (userId === loggedId) {
    throw new ApiError(403, "You can't delete your own account!");
  }
  const existingUser = await getSingleUserIntoDB(userId);
  if (!existingUser) {
    throw new ApiError(404, "user not found for delete this");
  }
  await prisma.user.delete({
    where: { id: userId },
  });
  return;
};

export const userService = {
  createUserIntoDB,
  signupVerification,
  getUsersIntoDB,
  getSingleUserIntoDB,
  updateUserIntoDB,
  deleteUserIntoDB,
};
