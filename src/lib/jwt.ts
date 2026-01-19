import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'rhapsody_crusades_app_secret_key_2024_change_in_production';
const JWT_ISSUER = process.env.JWT_ISSUER || 'rhapsody-crusades-app';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'rhapsody-crusades-mobile';
const JWT_EXPIRY_DAYS = parseInt(process.env.JWT_EXPIRY_DAYS || '30', 10);

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface DecodedToken extends JwtPayload {
  userId: string;
  email: string;
}

export function signToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: `${JWT_EXPIRY_DAYS}d`,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as DecodedToken;

    return decoded;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    return jwt.decode(token) as DecodedToken | null;
  } catch {
    return null;
  }
}

export function refreshTokenIfNeeded(token: string): string | null {
  const decoded = verifyToken(token);
  if (!decoded) return null;

  // Check if token expires within 7 days
  const exp = decoded.exp || 0;
  const now = Math.floor(Date.now() / 1000);
  const sevenDaysInSeconds = 7 * 24 * 60 * 60;

  if (exp - now < sevenDaysInSeconds) {
    // Refresh the token
    return signToken({
      userId: decoded.userId,
      email: decoded.email,
    });
  }

  return null;
}

export function getExpiresIn(): number {
  return JWT_EXPIRY_DAYS * 24 * 60 * 60; // in seconds
}
