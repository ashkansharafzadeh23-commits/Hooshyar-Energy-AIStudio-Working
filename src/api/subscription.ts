import express from "express";
import { subscriptionRepository } from '../repositories/subscriptionRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { verifyAuthToken, requireAuth } from "./auth.js";
import { paymentService } from "../services/paymentService.js";

const subscriptionRouter = express.Router();
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

subscriptionRouter.get("/plans", (req, res) => {
  res.json({ plans: subscriptionRepository.getSubscriptionPlans() });
});

subscriptionRouter.get("/production-status", (req, res) => {
  const status = paymentService.getPaymentProductionStatus();
  res.json({
    status,
    gateway: "zarinpal",
    isProductionVerified: status === "PRODUCTION_VERIFIED",
    isSandboxOnly: status === "SANDBOX_ONLY",
    isConfigured: status !== "NOT_CONFIGURED"
  });
});

subscriptionRouter.post("/purchase", verifyAuthToken, requireAuth, async (req, res) => {
  const { planId } = req.body;
  const user = req.user!;

  const plan = subscriptionRepository.getSubscriptionPlanById(planId);
  if (!plan) return res.status(404).json({ error: "Plan not found" });

  if (plan.priceIRR === 0) {
    // Handle free plan activation immediately
    const newSub = subscriptionRepository.createSubscription({
      userId: user.id,
      planId: plan.id,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    userRepository.updateUser(user.id, { activeSubscriptionId: newSub.id });
    return res.json({ message: "Free plan activated successfully", subscription: newSub });
  }

  try {
    const paymentResult = await paymentService.requestPayment({
      userId: user.id,
      planId: plan.id,
      userPhone: user.phone,
      callbackUrl: `${APP_BASE_URL}/api/subscription/verify`
    });

    res.json({
      paymentUrl: paymentResult.paymentUrl,
      authority: paymentResult.authority,
      transactionId: paymentResult.transactionId,
      isSandbox: paymentResult.isSandbox
    });
  } catch (error: any) {
    const isConfigError = error.message?.includes('NOT_CONFIGURED') || error.message?.includes('Mock payment is prohibited');
    const statusCode = isConfigError ? 503 : 500;
    res.status(statusCode).json({
      code: isConfigError ? 'SERVICE_NOT_CONFIGURED' : 'PAYMENT_REQUEST_FAILED',
      error: error.message || "Payment request failed"
    });
  }
});

subscriptionRouter.get("/verify", async (req, res) => {
  const { Authority, Status } = req.query;

  if (!Authority || typeof Authority !== "string") {
    return res.redirect("/user-dashboard?error=invalid_request");
  }

  try {
    const result = await paymentService.verifyPayment({
      authority: Authority,
      status: String(Status || 'FAILED')
    });

    if (result.verified) {
      const targetUser = subscriptionRepository.getTransactionByAuthority(Authority);
      if (targetUser && result.subscriptionId) {
        userRepository.updateUser(targetUser.userId, { activeSubscriptionId: result.subscriptionId });
      }

      if (result.alreadyVerified) {
        return res.redirect("/user-dashboard?success=payment_already_verified");
      }
      return res.redirect("/user-dashboard?success=payment_successful");
    } else {
      return res.redirect(`/user-dashboard?error=${encodeURIComponent(result.message || 'verification_failed')}`);
    }
  } catch (error: any) {
    const isConfigError = error.message?.includes('NOT_CONFIGURED') || error.message?.includes('Mock payment is prohibited');
    if (isConfigError) {
      return res.status(503).json({
        code: 'SERVICE_NOT_CONFIGURED',
        error: 'درگاه پرداخت در محیط عملیاتی فعال نیست.'
      });
    }
    return res.redirect("/user-dashboard?error=server_error");
  }
});

subscriptionRouter.get("/status", verifyAuthToken, requireAuth, (req, res) => {
  const user = req.user!;
  
  if (!user.activeSubscriptionId) {
    return res.json({ active: false });
  }

  const sub = subscriptionRepository.getSubscriptionById(user.activeSubscriptionId);
  if (!sub) {
    return res.json({ active: false });
  }

  const isExpired = new Date(sub.endDate) < new Date();
  if (isExpired) {
    userRepository.updateUser(user.id, { activeSubscriptionId: null });
    return res.json({ active: false, expired: true });
  }

  res.json({ active: true, subscription: sub });
});

export default subscriptionRouter;
