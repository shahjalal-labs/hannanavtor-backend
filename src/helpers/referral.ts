import prisma from "../shared/prisma";

export const generateUniqueReferralCode = async (): Promise<string> => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const length = 6;

  const generateCode = () =>
    Array.from(
      { length },
      () => characters[Math.floor(Math.random() * characters.length)]
    ).join("");

  let code = generateCode();
  let exists = await prisma.user.findUnique({ where: { referralCode: code } });

  while (exists) {
    code = generateCode();
    exists = await prisma.user.findUnique({ where: { referralCode: code } });
  }

  return code;
};
