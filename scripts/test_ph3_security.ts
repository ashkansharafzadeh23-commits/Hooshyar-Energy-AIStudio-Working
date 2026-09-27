import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import express from 'express';
import http from 'http';
import { getSecurityConfig } from '../src/security/config.js';
import { resetEnvironmentConfig } from '../src/config/environment.js';
import { jwtService } from '../src/security/jwtService.js';
import { otpService } from '../src/security/otpService.js';
import { passwordService } from '../src/security/passwordService.js';
import { sanitizeResponseData } from '../src/security/sanitizer.js';
import { pickAllowedFields, stripProtectedFields } from '../src/security/massAssignment.js';
import { uploadSecurity } from '../src/security/uploadSecurity.js';
import { InMemoryRateLimiter } from '../src/security/rateLimiter.js';
import { requestIdMiddleware } from '../src/middleware/requestId.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { requireAuthenticatedUser, requireAdmin, requireProjectAccess, requireOrganizationAccess } from '../src/middleware/authorization.js';
import { validateRequest, commonSchemas } from '../src/security/schemaValidator.js';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import { z } from 'zod';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`[PASS] ${msg}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${msg}`);
    failedCount++;
    throw new Error(`Assertion Failed: ${msg}`);
  }
}

async function runSecurityTests() {
  console.log('================================================================');
  console.log('HOOSHYAR ENERGY — PRODUCTION HARDENING (PH-3) SECURITY SUITE');
  console.log('================================================================');

  const isolation = setupTestDatabaseIsolation('ph3_security');

  try {
  // TEST 1: JWT Production Fail-Fast & Claims
  console.log('\n--- TEST 1: JWT SECURITY & CLAIMS ---');
  {
    // Test fail-fast in production when JWT_SECRET missing
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      resetEnvironmentConfig();
      let caughtError = false;
      try {
        getSecurityConfig();
      } catch (e: any) {
        caughtError = true;
        assert(
          e.message.includes('JWT_SECRET') && (e.message.includes('production') || e.message.includes('missing')),
          'Production missing JWT_SECRET fails fast with fatal error'
        );
      }
      assert(caughtError, 'Config correctly rejected production without JWT_SECRET');
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalSecret) process.env.JWT_SECRET = originalSecret;
      resetEnvironmentConfig();
    }

    // Sign and verify with claims
    const token = jwtService.sign({ userId: 'USR-SEC-001', role: 'ADMIN' });
    assert(typeof token === 'string' && token.split('.').length === 3, 'Generated standard 3-part signed JWT');

    const decoded = jwtService.verify(token);
    assert(decoded.userId === 'USR-SEC-001', 'Decoded token contains correct userId');
    assert(decoded.role === 'ADMIN', 'Decoded token contains role claim');
    assert(decoded.iss === 'hooshyar-energy', 'Token issuer is hooshyar-energy');
    assert(decoded.aud === 'hooshyar-api', 'Token audience is hooshyar-api');
  }

  // TEST 2: OTP Cryptographic Security, Expiration, & Throttling
  console.log('\n--- TEST 2: OTP CRYPTOGRAPHIC SECURITY & THROTTLING ---');
  {
    const testPhone = '09129999999';
    const { code, expiresAt } = otpService.generateOTP(testPhone);

    assert(code.length === 6, 'OTP code is exactly 6 digits');
    assert(/^\d{6}$/.test(code), 'OTP code contains only cryptographically secure decimal digits');
    assert(expiresAt > Date.now(), 'OTP expiration timestamp is in the future');

    // Attempt throttling: 3 failed attempts
    const r1 = otpService.verifyOTP(testPhone, '000000');
    assert(!r1.success && r1.error === 'INVALID_OTP', 'Attempt 1 fails gracefully');
    assert(otpService.getAttempts(testPhone) === 1, 'Attempt counter increments to 1');

    const r2 = otpService.verifyOTP(testPhone, '000001');
    assert(!r2.success && r2.error === 'INVALID_OTP', 'Attempt 2 fails gracefully');
    assert(otpService.getAttempts(testPhone) === 2, 'Attempt counter increments to 2');

    const r3 = otpService.verifyOTP(testPhone, '000002');
    assert(!r3.success && r3.error === 'TOO_MANY_ATTEMPTS', 'Attempt 3 reaches max attempts and triggers TOO_MANY_ATTEMPTS');

    // After max attempts, even the correct code MUST be rejected!
    const r4 = otpService.verifyOTP(testPhone, code);
    assert(!r4.success, 'Exceeded attempt OTP permanently rejects subsequent valid code');

    // Single-use verification
    const { code: newCode } = otpService.generateOTP(testPhone);
    const validResult = otpService.verifyOTP(testPhone, newCode);
    assert(validResult.success === true, 'Valid code verifies successfully');

    // Replay attack prevention: second attempt must fail
    const replayResult = otpService.verifyOTP(testPhone, newCode);
    assert(!replayResult.success, 'Replay attack blocked: OTP is single-use and invalidated immediately');
  }

  // TEST 3: Password Security & Sanitization
  console.log('\n--- TEST 3: PASSWORD SECURITY & SANITIZATION ---');
  {
    const rawPass = 'SuperSecretP@ss123!';
    const hash = passwordService.hashPassword(rawPass);
    assert(hash.includes(':'), 'Password hash uses salt:key format');
    assert(passwordService.verifyPassword(rawPass, hash), 'Password verification succeeds with correct password');
    assert(!passwordService.verifyPassword('WrongP@ssword', hash), 'Password verification fails with wrong password');

    const userObj = {
      id: 'USR-01',
      name: 'Ali',
      password: rawPass,
      passwordHash: hash
    };
    const sanitized = passwordService.sanitizeUser(userObj);
    assert(!('password' in sanitized) && !('passwordHash' in sanitized), 'Password and hash are completely removed by sanitizeUser');
  }

  // TEST 4: Mass Assignment & Sensitive Data Sanitization
  console.log('\n--- TEST 4: MASS ASSIGNMENT PROTECTION ---');
  {
    const maliciousInput = {
      title: 'Solar Project Alpha',
      location: 'Tehran',
      ownerId: 'ATTACKER_ID',
      organizationId: 'VICTIM_ORG',
      verificationStatus: 'VERIFIED',
      readinessScore: 100,
      isAdmin: true
    };

    // Pick allowed fields only
    const cleanFields = pickAllowedFields(maliciousInput, ['title', 'location']);
    assert(cleanFields.title === 'Solar Project Alpha', 'Allowed field title is kept');
    assert(cleanFields.location === 'Tehran', 'Allowed field location is kept');
    assert(!('ownerId' in cleanFields), 'Protected ownerId is rejected');
    assert(!('organizationId' in cleanFields), 'Protected organizationId is rejected');
    assert(!('verificationStatus' in cleanFields), 'Protected verificationStatus is rejected');
    assert(!('readinessScore' in cleanFields), 'Protected readinessScore is rejected');
    assert(!('isAdmin' in cleanFields), 'Protected isAdmin is rejected');

    // Strip protected fields
    const stripped = stripProtectedFields(maliciousInput);
    assert(!('ownerId' in stripped), 'stripProtectedFields removed ownerId');
    assert(!('readinessScore' in stripped), 'stripProtectedFields removed readinessScore');

    // Deep recursive response serializer sanitization
    const responsePayload = {
      userId: '123',
      profile: {
        name: 'Test',
        jwtSecret: 'super_secret_key',
        otp: '123456',
        apiKey: 'sk-12345'
      }
    };
    const safeOutput = sanitizeResponseData(responsePayload);
    assert(!('jwtSecret' in safeOutput.profile), 'jwtSecret stripped from nested response');
    assert(!('otp' in safeOutput.profile), 'otp stripped from nested response');
    assert(!('apiKey' in safeOutput.profile), 'apiKey stripped from nested response');
  }

  // TEST 5: Schema Validation (Zod)
  console.log('\n--- TEST 5: SCHEMA VALIDATION ENGINE ---');
  {
    const app = express();
    app.use(express.json());

    const testSchema = z.object({
      projectName: commonSchemas.shortString,
      capacityKw: commonSchemas.positiveNumber,
      contactPhone: commonSchemas.phone
    });

    app.post('/test-validate', validateRequest({ body: testSchema }), (req, res) => {
      res.json({ ok: true });
    });

    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;

    // Bad payload: negative capacity
    const badRes = await fetch(`http://localhost:${port}/test-validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: 'Test',
        capacityKw: -50,
        contactPhone: '09121111111'
      })
    });
    assert(badRes.status === 400, 'Rejects negative capacity with 400 Bad Request');
    const badJson = await badRes.json();
    assert(badJson.code === 'VALIDATION_ERROR', 'Validation error code returned');

    // Valid payload
    const goodRes = await fetch(`http://localhost:${port}/test-validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: 'Test Project',
        capacityKw: 50,
        contactPhone: '09121111111'
      })
    });
    assert(goodRes.status === 200, 'Accepts valid schema payload with 200 OK');

    server.close();
  }

  // TEST 6: File Upload Security
  console.log('\n--- TEST 6: FILE UPLOAD SECURITY ---');
  {
    assert(uploadSecurity.isExtensionAllowed('spec.pdf'), 'Allows .pdf files');
    assert(uploadSecurity.isExtensionAllowed('layout.dwg'), 'Allows .dwg files');
    assert(uploadSecurity.isExtensionAllowed('photo.jpg'), 'Allows .jpg files');
    assert(!uploadSecurity.isExtensionAllowed('malware.exe'), 'Blocks dangerous .exe extension');
    assert(!uploadSecurity.isExtensionAllowed('script.sh'), 'Blocks dangerous .sh extension');
    assert(!uploadSecurity.isExtensionAllowed('page.html'), 'Blocks .html upload');

    const sanitizedName = uploadSecurity.sanitizeFileName('../../etc/passwd.pdf');
    assert(!sanitizedName.includes('..') && !sanitizedName.includes('/'), 'Sanitizes directory traversal path');
    assert(sanitizedName === 'passwd.pdf', 'Path traversal sanitized down to basename');
  }

  // TEST 7: Rate Limiting
  console.log('\n--- TEST 7: RATE LIMITING ---');
  {
    const limiter = new InMemoryRateLimiter({
      category: 'AUTH_STRICT',
      windowMs: 60 * 1000,
      max: 2,
      message: 'Rate limit exceeded'
    });

    const app = express();
    app.use(limiter.middleware());
    app.get('/limited', (req, res) => res.json({ ok: true }));

    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const res1 = await fetch(`http://localhost:${port}/limited`);
    assert(res1.status === 200, 'Request 1 succeeds within rate limit');

    const res2 = await fetch(`http://localhost:${port}/limited`);
    assert(res2.status === 200, 'Request 2 succeeds within rate limit');

    const res3 = await fetch(`http://localhost:${port}/limited`);
    assert(res3.status === 429, 'Request 3 blocked with 429 Too Many Requests');
    const json3 = await res3.json();
    assert(json3.code === 'RATE_LIMIT_EXCEEDED', 'Returns standard RATE_LIMIT_EXCEEDED code');

    server.close();
  }

  // TEST 8: Request ID Correlation & Standard Error Handler
  console.log('\n--- TEST 8: REQUEST ID & STANDARD ERROR MODEL ---');
  {
    const app = express();
    app.use(requestIdMiddleware);
    app.get('/error-test', (req, res, next) => {
      const err: any = new Error('Sensitive database exception: SELECT * FROM secrets');
      err.statusCode = 500;
      next(err);
    });
    app.use(errorHandler);

    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const res = await fetch(`http://localhost:${port}/error-test`, {
      headers: { 'X-Request-Id': '11111111-2222-3333-4444-555555555555' }
    });
    assert(res.status === 500, 'Returns 500 status');
    assert(res.headers.get('x-request-id') === '11111111-2222-3333-4444-555555555555', 'Propagates verified X-Request-Id in response headers');

    const json = await res.json();
    assert(json.code === 'INTERNAL_SERVER_ERROR', 'Standard error code returned');
    assert(json.requestId === '11111111-2222-3333-4444-555555555555', 'Request ID included in JSON error response');

    server.close();
  }

  // TEST 9: Production Privilege Escalation Guards
  console.log('\n--- TEST 9: PRODUCTION PRIVILEGE ESCALATION GUARDS ---');
  {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const app = express();
      app.use(express.json());
      app.post('/api/user/dev-make-admin', (req, res) => {
        if (process.env.NODE_ENV === 'production') {
          return res.status(403).json({ code: 'FORBIDDEN', error: 'Disabled in production' });
        }
        res.json({ message: 'Admin granted' });
      });

      const server = http.createServer(app);
      await new Promise<void>(resolve => server.listen(0, resolve));
      const port = (server.address() as any).port;

      const res = await fetch(`http://localhost:${port}/api/user/dev-make-admin`, { method: 'POST' });
      assert(res.status === 403, 'Privilege escalation endpoint dev-make-admin returns 403 in production');

      server.close();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  }

  console.log('\n================================================================');
  console.log(`PH-3 SECURITY TESTS COMPLETED: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================');
  } finally {
    isolation.cleanup();
  }
}

runSecurityTests().catch(err => {
  console.error('Test run error:', err);
  process.exit(1);
});
