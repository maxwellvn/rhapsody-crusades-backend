import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectDB from './db';
import Admin, { IAdmin } from '@/models/Admin';

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'rhapsody_admin_session_secret_2024';

export interface AdminSession {
  adminId: string;
  username: string;
  name: string;
  role: string;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;

    if (!sessionToken) {
      return null;
    }

    const decoded = jwt.verify(sessionToken, ADMIN_SESSION_SECRET) as AdminSession;
    return decoded;
  } catch {
    return null;
  }
}

export async function createAdminSession(admin: IAdmin): Promise<string> {
  const payload: AdminSession = {
    adminId: admin._id.toHexString(),
    username: admin.username,
    name: admin.name,
    role: admin.role,
  };

  return jwt.sign(payload, ADMIN_SESSION_SECRET, { expiresIn: '24h' });
}

export async function requireAdminAuth(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function getOrCreateDefaultAdmin(): Promise<void> {
  await connectDB();

  const adminCount = await Admin.countDocuments();
  if (adminCount === 0) {
    // Create default admin
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 12);

    await Admin.create({
      username: 'admin',
      password: hashedPassword,
      name: 'Administrator',
      role: 'admin',
    });

    console.log('Default admin created: admin / admin123');
  }
}
