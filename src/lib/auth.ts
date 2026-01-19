import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { verifyToken, refreshTokenIfNeeded, DecodedToken } from './jwt';
import connectDB from './db';
import User, { IUser } from '@/models/User';

export interface AuthResult {
  user: IUser | null;
  decoded: DecodedToken | null;
  newToken: string | null;
  error: string | null;
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      user: null,
      decoded: null,
      newToken: null,
      error: 'No token provided',
    };
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return {
      user: null,
      decoded: null,
      newToken: null,
      error: 'Invalid or expired token',
    };
  }

  await connectDB();
  const user = await User.findById(decoded.userId).select('-password');

  if (!user) {
    return {
      user: null,
      decoded: null,
      newToken: null,
      error: 'User not found',
    };
  }

  // Check if token needs refresh
  const newToken = refreshTokenIfNeeded(token);

  return {
    user,
    decoded,
    newToken,
    error: null,
  };
}

export async function optionalAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      user: null,
      decoded: null,
      newToken: null,
      error: null,
    };
  }

  return verifyAuth(request);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateResetToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function generateQRCode(): string {
  const chars = 'abcdef0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateId(): string {
  return Math.random().toString(16).substring(2, 15) + Math.random().toString(16).substring(2, 15);
}
