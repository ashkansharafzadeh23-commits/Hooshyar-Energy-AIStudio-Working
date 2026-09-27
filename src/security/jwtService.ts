import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { getSecurityConfig } from './config.js';

export interface TokenPayload {
  userId: string;
  phone?: string;
  role?: string;
  organizationId?: string;
  [key: string]: any;
}

export const jwtService = {
  sign(payload: TokenPayload, customOptions?: SignOptions): string {
    const config = getSecurityConfig();
    const options: SignOptions = {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      expiresIn: (config.jwt.expiresIn as any) || '7d',
      ...customOptions
    };

    return jwt.sign(payload, config.jwt.secret, options);
  },

  verify(token: string, customOptions?: VerifyOptions): TokenPayload {
    const config = getSecurityConfig();
    return jwt.verify(token, config.jwt.secret, customOptions) as TokenPayload;
  },

  decode(token: string): any {
    return jwt.decode(token);
  }
};
