import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'EMAIL_VERIFICATION_REQUIRED' },
    { status: 410 },
  );
}
