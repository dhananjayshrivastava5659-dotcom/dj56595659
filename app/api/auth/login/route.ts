import { NextRequest, NextResponse } from 'next/server';
import { DEMO_ACCOUNTS, signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { employeeId, password } = await req.json();

    if (!employeeId || !password) {
      return NextResponse.json({ error: 'Employee ID and password are required.' }, { status: 400 });
    }

    const account = DEMO_ACCOUNTS.find(
      a => a.employeeId.toLowerCase() === employeeId.toLowerCase() && a.password === password
    );

    if (!account) {
      return NextResponse.json({ error: 'Invalid Employee ID or password.' }, { status: 401 });
    }

    const token = await signToken(account.user);

    const response = NextResponse.json({ success: true, user: account.user });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
