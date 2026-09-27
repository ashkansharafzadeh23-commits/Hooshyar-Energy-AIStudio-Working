/**
 * Hooshyar Energy — Payment Production Boundary Service (PH-5)
 * 
 * Implements strict separation of payment request and payment verification.
 * Enforces:
 *  - Server-side provider verification (never trust callback params alone)
 *  - Duplicate verification & replay protection
 *  - Duplicate subscription activation prevention
 *  - Amount and user matching
 *  - Truthful status reporting (PRODUCTION_VERIFIED, SANDBOX_ONLY, NOT_CONFIGURED, NOT_VERIFIED)
 *  - Timeout & circuit breaker protection on provider requests
 *  - Redaction of merchant IDs and financial credentials
 */

import { subscriptionRepository } from '../repositories/subscriptionRepository.js';
import { externalClient } from '../reliability/externalClient.js';
import { logger } from '../observability/logger.js';
import { mockGuards } from '../security/mockGuard.js';
import { getEnvironmentConfig, maskSecret } from '../config/environment.js';

export type PaymentProductionStatus =
  | 'PRODUCTION_VERIFIED'
  | 'SANDBOX_ONLY'
  | 'NOT_CONFIGURED'
  | 'NOT_VERIFIED';

export interface PaymentRequestParams {
  userId: string;
  planId: string;
  callbackUrl?: string;
  userPhone?: string;
}

export interface PaymentRequestResult {
  authority: string;
  paymentUrl: string;
  transactionId: string;
  amount: number;
  isSandbox: boolean;
  status: 'PENDING';
}

export interface PaymentVerificationParams {
  authority: string;
  status: string;
  userId?: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  code: number;
  message: string;
  refId?: string;
  subscriptionId?: string;
  alreadyVerified?: boolean;
  transactionId?: string;
}

export class PaymentService {
  /**
   * Truthfully determines the production status of the payment gateway
   */
  public getPaymentProductionStatus(): PaymentProductionStatus {
    const config = getEnvironmentConfig();
    return config.integrations.payment.status;
  }

  /**
   * Step 1: Initiate Payment Request
   */
  public async requestPayment(params: PaymentRequestParams): Promise<PaymentRequestResult> {
    const config = getEnvironmentConfig();
    const merchantId = process.env.ZARINPAL_MERCHANT_ID;
    const isSandbox = process.env.ZARINPAL_SANDBOX === 'true';

    // In production, block if not configured
    if (config.isProduction && !merchantId) {
      throw new Error('SERVICE_NOT_CONFIGURED: Zarinpal payment gateway is not configured in production. Mock payment is prohibited.');
    }

    const plan = subscriptionRepository.getSubscriptionPlanById(params.planId);
    if (!plan) {
      throw new Error(`Plan ${params.planId} not found`);
    }

    const callbackUrl = params.callbackUrl || `${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/subscriptions/callback`;

    // Real Zarinpal integration when merchant ID is provided
    if (merchantId) {
      const zarinpalUrl = isSandbox
        ? 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
        : 'https://api.zarinpal.com/pg/v4/payment/request.json';

      const payload = {
        merchant_id: merchantId,
        amount: plan.priceIRR,
        currency: 'IRR',
        description: `اشتراک سامانه هوشیار انرژی - پلن ${plan.nameFa}`,
        callback_url: callbackUrl,
        metadata: {
          mobile: params.userPhone || '',
          userId: params.userId,
          planId: plan.id
        }
      };

      try {
        const response = await externalClient.post(zarinpalUrl, payload, {
          timeoutMs: 8000,
          service: 'ZARINPAL_GATEWAY',
          operation: 'REQUEST_PAYMENT',
          isIdempotent: false
        });

        const data = response.data;
        if (data && data.data && data.data.code === 100) {
          const authority = data.data.authority;
          const gatewayBase = isSandbox ? 'https://sandbox.zarinpal.com/pg/StartPay/' : 'https://www.zarinpal.com/pg/StartPay/';
          const paymentUrl = `${gatewayBase}${authority}`;

          const tx = subscriptionRepository.createTransaction({
            userId: params.userId,
            planId: plan.id,
            amount: plan.priceIRR,
            currency: 'IRR',
            status: 'pending',
            authority,
            gateway: 'zarinpal',
            gatewayMetadata: {
              isSandbox,
              authority
            }
          });

          return {
            authority,
            paymentUrl,
            transactionId: tx.id,
            amount: plan.priceIRR,
            isSandbox,
            status: 'PENDING'
          };
        } else {
          logger.error('Zarinpal request error returned from gateway', {
            service: 'PAYMENT_SERVICE',
            event: 'ZARINPAL_REQUEST_REJECTED',
            metadata: { code: data?.data?.code || data?.errors?.code }
          });
          throw new Error(`Zarinpal gateway error: code ${data?.data?.code || data?.errors?.code || 'UNKNOWN'}`);
        }
      } catch (err: any) {
        logger.error('Payment gateway communication failed', err, {
          service: 'PAYMENT_SERVICE',
          event: 'GATEWAY_HTTP_FAILURE',
          metadata: { isSandbox }
        });
        throw err;
      }
    }

    // Development / Test Fallback
    const simulatedAuthority = `MOCK_AUTH_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const tx = subscriptionRepository.createTransaction({
      userId: params.userId,
      planId: plan.id,
      amount: plan.priceIRR,
      currency: 'IRR',
      status: 'pending',
      authority: simulatedAuthority,
      gateway: 'zarinpal_sandbox_mock',
      gatewayMetadata: {
        isMock: true,
        merchantId: maskSecret(merchantId)
      }
    });

    const paymentUrl = `/api/subscriptions/mock-payment-page?authority=${simulatedAuthority}`;

    return {
      authority: simulatedAuthority,
      paymentUrl,
      transactionId: tx.id,
      amount: plan.priceIRR,
      isSandbox: true,
      status: 'PENDING'
    };
  }

  /**
   * Step 2: Server-Side Payment Verification
   */
  public async verifyPayment(params: PaymentVerificationParams): Promise<PaymentVerificationResult> {
    const { authority, status, userId } = params;

    if (!authority) {
      return {
        verified: false,
        code: -1,
        message: 'شناسه مرجع پرداخت (Authority) ارائه نشده است.'
      };
    }

    // 1. Locate existing transaction
    const tx = subscriptionRepository.getTransactionByAuthority(authority);
    if (!tx) {
      return {
        verified: false,
        code: -2,
        message: 'تراکنش متناظر با این شناسه یافت نشد.'
      };
    }

    // 2. User ownership validation (if authenticated user provided)
    if (userId && tx.userId !== userId) {
      logger.warn('Payment verification user mismatch detected', {
        service: 'PAYMENT_SERVICE',
        event: 'SECURITY_ALERT_USER_MISMATCH',
        metadata: { expectedUser: tx.userId, requestingUser: userId, authority }
      });
      return {
        verified: false,
        code: -3,
        message: 'عدم تطابق کاربر دارنده تراکنش.'
      };
    }

    // 3. Durable Idempotency: If transaction is already successful, return idempotent success
    if (tx.status === 'success') {
      // Find associated subscription
      const userSubs = subscriptionRepository.getUserSubscriptions(tx.userId);
      const activeSub = userSubs.find(s => s.planId === tx.planId && s.status === 'active');

      return {
        verified: true,
        alreadyVerified: true,
        code: 101, // 101 in Zarinpal signifies "Transaction has already been verified"
        message: 'این تراکنش قبلاً با موفقیت تأیید شده است.',
        refId: tx.refId || 'ALREADY_VERIFIED',
        subscriptionId: activeSub?.id,
        transactionId: tx.id
      };
    }

    // 4. Callback status check
    if (status !== 'OK') {
      subscriptionRepository.updateTransaction(tx.id, {
        status: 'failed',
        errorMessage: 'توسط کاربر یا درگاه لغو شد.'
      });
      return {
        verified: false,
        code: -10,
        message: 'پرداخت در درگاه بانکی تکمیل نشد یا لغو گردید.'
      };
    }

    const config = getEnvironmentConfig();
    const merchantId = process.env.ZARINPAL_MERCHANT_ID;
    const isSandbox = process.env.ZARINPAL_SANDBOX === 'true';

    // 5. In production without credentials, refuse to fabricate success
    if (config.isProduction && !merchantId) {
      throw new Error('SERVICE_NOT_CONFIGURED: Zarinpal payment gateway is not configured in production. Mock verification is prohibited.');
    }

    // 6. Live verification call when configured
    if (merchantId && !tx.authority.startsWith('MOCK_AUTH_')) {
      const verifyUrl = isSandbox
        ? 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json'
        : 'https://api.zarinpal.com/pg/v4/payment/verify.json';

      const payload = {
        merchant_id: merchantId,
        amount: tx.amount,
        authority: tx.authority
      };

      try {
        const response = await externalClient.post(verifyUrl, payload, {
          timeoutMs: 10000,
          service: 'ZARINPAL_GATEWAY',
          operation: 'VERIFY_PAYMENT',
          isIdempotent: true
        });

        const data = response.data;
        const respCode = data?.data?.code;

        if (respCode === 100 || respCode === 101) {
          const refId = String(data.data.ref_id);

          subscriptionRepository.updateTransaction(tx.id, {
            status: 'success',
            refId,
            verifiedAt: new Date().toISOString()
          });

          // Activate subscription
          const newSub = this.activateSubscriptionForTransaction(tx);

          return {
            verified: true,
            code: respCode,
            message: 'پرداخت با موفقیت توسط درگاه بانکی تأیید شد.',
            refId,
            subscriptionId: newSub.id,
            transactionId: tx.id
          };
        } else {
          subscriptionRepository.updateTransaction(tx.id, {
            status: 'failed',
            errorMessage: `کد خطای تأیید درگاه: ${respCode}`
          });

          return {
            verified: false,
            code: respCode || -99,
            message: 'تأیید تراکنش توسط درگاه بانکی ناموفق بود.'
          };
        }
      } catch (err: any) {
        logger.error('Payment verification failed on gateway call', err, {
          service: 'PAYMENT_SERVICE',
          event: 'ZARINPAL_VERIFICATION_ERROR',
          metadata: { authority: tx.authority }
        });
        throw err;
      }
    }

    // 7. Non-production simulated verification
    const simulatedRefId = `SIM_REF_${Date.now()}`;
    subscriptionRepository.updateTransaction(tx.id, {
      status: 'success',
      refId: simulatedRefId,
      verifiedAt: new Date().toISOString()
    });

    const newSub = this.activateSubscriptionForTransaction(tx);

    return {
      verified: true,
      code: 100,
      message: '[SANDBOX/TEST] پرداخت با موفقیت ثبت شد.',
      refId: simulatedRefId,
      subscriptionId: newSub.id,
      transactionId: tx.id
    };
  }

  private activateSubscriptionForTransaction(tx: any) {
    const plan = subscriptionRepository.getSubscriptionPlanById(tx.planId);
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (plan?.durationDays || 30) * 24 * 60 * 60 * 1000);

    return subscriptionRepository.createSubscription({
      userId: tx.userId,
      planId: tx.planId,
      status: 'active',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      pricePaid: tx.amount,
      currency: tx.currency,
      transactionId: tx.id,
      autoRenew: false
    });
  }
}

export const paymentService = new PaymentService();
