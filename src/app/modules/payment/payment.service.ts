import { Subscription } from "@prisma/client";
import stripe from "../../../config/stripe";
import ApiError from "../../../errors/ApiErrors";
import { onboardingHtml } from "../../../helpers/onboardingHtml";
import sendEmail from "../../../helpers/sendEmail";
import prisma from "../../../shared/prisma";
import { paginationHelper } from "../../../shared/pagination";
import { Request } from "express";

const createOnboarding = async (userId: string) => {
  const userInfo = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      accountId: true,
    },
  });

  if (!userInfo) {
    throw new ApiError(404, "User not found");
  }

  const userEmail = userInfo.email;
  let accountId = userInfo.accountId;

  // Create a Stripe account if the user doesn't have one
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: userEmail,
      capabilities: {
        transfers: { requested: true },
      },
    });

    if (!account) {
      throw new ApiError(500, "Failed to create Stripe account");
    }
    accountId = account.id;

    // Update the user's accountId in the database
    await prisma.user.update({
      where: { id: userId },
      data: { accountId },
    });
  }

  // Generate account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: "https://your-platform.com/reauth",
    return_url: "https://your-platform.com/return",
    type: "account_onboarding",
  });

  // Prepare email content
  const html = await onboardingHtml({
    fullName: userInfo.username,
    accountLink: accountLink.url,
  });

  // Send the onboarding email
  await sendEmail(userEmail, "Your Onboarding URL", html);

  return { accountId, accountLink };
};

const createPlan = async (
  userId: string,
  payload: {
    planName: string;
    amount: number;
    intervalCount: number;
    discount: number;
  }
) => {
  const { planName, amount, intervalCount = 1 } = payload;
  const userInfo = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      accountId: true,
    },
  });
  if (!userInfo || !userInfo.accountId) {
    throw new ApiError(
      404,
      "User not found or not connected to a Stripe account"
    );
  }

  const plans = await prisma.plan.findMany({
    where: {
      userId,
    },
  });

  if (plans.length === 4) {
    throw new ApiError(400, "You cannot create more plans");
  }

  // Create a Stripe product
  const product = await stripe.products.create(
    {
      name: planName,
    },
    {
      stripeAccount: userInfo.accountId, // Specify the connected account
    }
  );

  if (!product) {
    throw new ApiError(500, "Failed to create Stripe product");
  }

  // Create a Stripe price
  const price = await stripe.prices.create(
    {
      unit_amount: amount * 100, // Amount in cents (e.g., $10.00 -> 1000)
      currency: "usd", // e.g., 'usd'
      product: product.id,
      recurring: { interval: "month", interval_count: intervalCount },
    },
    {
      stripeAccount: userInfo.accountId, // Specify the connected account
    }
  );

  if (!price) {
    throw new ApiError(500, "Failed to create Stripe price");
  }

  const result = await prisma.plan.create({
    data: {
      ...payload,
      userId,
      priceId: price.id,
      connectedAccountId: userInfo.accountId,
    },
  });

  return result;
};

const buySubscription = async (userId: string, payload: Subscription) => {
  const { paymentMethodId, priceId } = payload;
  const plan = await prisma.plan.findFirst({
    where: {
      priceId: priceId,
    },
  });

  const connectedAccountId = plan?.connectedAccountId;

  const userInfo = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!userInfo) {
    throw new ApiError(404, "User not found");
  }

  const isExistSubscription = await prisma.subscription.findFirst({
    where: { priceId: payload.priceId },
  });

  if (isExistSubscription) {
    throw new ApiError(409, "You have already subscribed this plan");
  }

  let customerId = userInfo?.customerId;

  if (!customerId) {
    const customer = await stripe.customers.create(
      {
        email: userInfo.email,
      },
      { stripeAccount: connectedAccountId }
    );
    customerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data: { customerId: customer.id },
    });
  }
  await stripe.paymentMethods.attach(
    paymentMethodId,
    {
      customer: customerId,
    },
    { stripeAccount: connectedAccountId }
  );

  await stripe.customers.update(
    customerId,
    {
      invoice_settings: { default_payment_method: paymentMethodId },
    },
    { stripeAccount: connectedAccountId }
  );

  let coupon;

  if (plan?.discount !== 0) {
    coupon = await stripe.coupons.create(
      {
        percent_off: plan?.discount,
        duration: "once",
      },
      { stripeAccount: connectedAccountId }
    );
  }

  const subscription: any = await stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: priceId }],
      discounts: coupon ? [{ coupon: coupon.id }] : undefined,
      expand: ["latest_invoice"],
      //   transfer_data: { //this for transer amount in other
      //     destination: connectedAccountId,
      //   },
    },
    { stripeAccount: connectedAccountId }
  );

  const subscriptionData = {
    paymentMethodId: paymentMethodId,
    userId: userId,
    priceId: priceId,
    subscriptionId: subscription.id,
    planName: subscription.plan.interval,
    connectedAccountId: connectedAccountId as string,
    discount: plan?.discount as number,
  };
  const createdSubscription = await prisma.subscription.create({
    data: subscriptionData,
  });

  return createdSubscription;
};

const myWalletBalance = async (userId: string) => {
  const userInfo = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      accountId: true,
    },
  });
  if (!userInfo) {
    throw new ApiError(404, "User not found!");
  }

  const balance = await stripe.balance.retrieve({
    stripeAccount: userInfo?.accountId as string,
  });
  const availableBalance = balance.available?.[0]?.amount || 0;
  const pendingBalance = balance.pending?.[0]?.amount || 0;
  const transactionsList = await stripe.balanceTransactions.list(
    { limit: 100 },
    { stripeAccount: userInfo.accountId as string }
  );
  const pastTransactionsTotal = transactionsList.data.reduce(
    (acc, txn) => acc + txn.amount,
    0
  );
  const lastTransaction = transactionsList.data[0];
  return {
    availableBalance: userInfo.accountId ? availableBalance / 100 : 0,
    pendingBalance: userInfo.accountId ? pendingBalance / 100 : 0,
    pastTransactionsTotal: userInfo.accountId ? pastTransactionsTotal / 100 : 0,
    lastTransactionAmount: userInfo.accountId
      ? lastTransaction
        ? lastTransaction.amount / 100
        : 0
      : 0,
  };
};

const withdrawBalance = async (userId: string, amount: number) => {
  const userInfo = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      accountId: true,
    },
  });
  if (!userInfo) {
    throw new ApiError(404, "User not found!");
  }

  const balance = await stripe.balance.retrieve({
    stripeAccount: userInfo?.accountId as string,
  });

  const availableBalance = balance.available?.[0]?.amount || 0;

  if (availableBalance === 0) {
    throw new ApiError(400, "You have insufficient balance in your account");
  }

  const payout = await stripe.payouts.create(
    {
      amount: amount * 100,
      currency: "usd",
    },
    { stripeAccount: userInfo.accountId as string }
  );
  await prisma.paymentActivity.create({
    data: {
      userId,
      amount,
      type: "Withdraw E-Wallet",
    },
  });

  return payout;
};

const myPaymentActivity = async (req: Request) => {
  const userId = req.user.id;
  const { page, limit, take, skip } = paginationHelper(req.query as any);
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const activities = await prisma.paymentActivity.findMany({
    where: {
      userId,
    },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });

  const totalCount = await prisma.paymentActivity.count({
    where: {
      userId,
    },
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    totalCount,
    totalPages,
    currentPage: page,
    activities,
  };
};

const addMoney = async (
  payload: {
    amount: number;
    paymentMethodId: string;
  },
  userId: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(404, "user not found");
  }
  let addMoneyCustomerId = user.addMoneyCustomerId;

  if (addMoneyCustomerId === null) {
    const customer = await stripe.customers.create({
      name: user.username,
      email: user.email,
    });
    addMoneyCustomerId = customer.id;

    await prisma.user.update({
      where: { id: userId },
      data: {
        addMoneyCustomerId: addMoneyCustomerId,
      },
    });
    await stripe.paymentMethods.attach(payload.paymentMethodId, {
      customer: addMoneyCustomerId,
    });
    await stripe.customers.update(addMoneyCustomerId, {
      invoice_settings: { default_payment_method: payload.paymentMethodId },
    });
  }
  await stripe.paymentMethods.attach(payload.paymentMethodId, {
    customer: addMoneyCustomerId,
  });
  await stripe.customers.update(addMoneyCustomerId, {
    invoice_settings: { default_payment_method: payload.paymentMethodId },
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: payload.amount * 100,
    currency: "usd",
    payment_method: payload.paymentMethodId,
    customer: addMoneyCustomerId,
    confirm: true,
    description: `Add money to platform account. user:${user.username}`,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
  });

  if (paymentIntent.status === "succeeded") {
    await prisma.user.update({
      where: { id: userId },
      data: {
        balance: {
          increment: payload.amount,
        },
      },
    });

    await prisma.paymentActivity.create({
      data: {
        amount: payload.amount,
        type: "Add money successfull",
        userId: userId,
      },
    });
  }
  return;
};

const myBalance = async (userId: string) => {
  const userInfo = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      balance: true,
      totalPay: true,
    },
  });

  return userInfo;
};

export const paymentServices = {
  createOnboarding,
  createPlan,
  buySubscription,
  myWalletBalance,
  withdrawBalance,
  myPaymentActivity,
  addMoney,
  myBalance,
};
