import { z } from "zod";

const createReferralValidation = z.object({
  serviceType: z.string().min(1, "Service type is required"),
  providerId: z.string().length(24, "Invalid provider ID"),
  clientId: z.string().length(24, "Invalid client ID"),
  purpose: z.string().min(1, "Purpose is required"),
  commitions: z
    .number()
    .nonnegative("Commissions must be a non-negative number"),
});

const createReviewValidation = z.object({
  rating: z
    .number()
    .min(1, "Rating minimum 1")
    .max(5, "Rating maximum 5")
    .nonnegative("Rating must be a non-negative number"),
  comment: z.string().min(1, "Comment is required"),
});

export const referralValidation = {
  createReferralValidation,
  createReviewValidation,
};
