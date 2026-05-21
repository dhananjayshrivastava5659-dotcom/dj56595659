import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { User } from '@/types';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ievent-icici-secret-key-2026-change-in-production'
);
const COOKIE_NAME = 'ievent_session';

export const DEMO_ACCOUNTS: Array<{
  employeeId: string;
  password: string;
  user: User;
}> = [
  {
    employeeId: '90046400',
    password: 'password',
    user: { id: 'user-admin-001', employeeId: '90046400', name: 'Admin User', role: 'ADMIN' },
  },
  {
    employeeId: '108168',
    password: 'password',
    user: { id: 'user-001', employeeId: '108168', name: 'Rohan Desai', role: 'USER' },
  },
  {
    employeeId: '204512',
    password: 'password',
    user: { id: 'user-002', employeeId: '204512', name: 'Priya Sharma', role: 'USER' },
  },
  {
    employeeId: '315687',
    password: 'password',
    user: { id: 'user-003', employeeId: '315687', name: 'Amit Kulkarni', role: 'USER' },
  },
  {
    employeeId: '427893',
    password: 'password',
    user: { id: 'user-004', employeeId: '427893', name: 'Neha Joshi', role: 'USER' },
  },
  {
    employeeId: '539214',
    password: 'password',
    user: { id: 'user-005', employeeId: '539214', name: 'Sanjay Mehta', role: 'USER' },
  },
  {
    employeeId: '641078',
    password: 'password',
    user: { id: 'user-006', employeeId: '641078', name: 'Kavita Nair', role: 'USER' },
  },
];

export async function signToken(user: User): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as User;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
