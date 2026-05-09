import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// One-time admin promotion endpoint.
// Hit GET /api/promote-admin while signed in to grant your account Admin access.
// After you've promoted yourself you can delete this file.
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: 'admin', isOwner: true },
    });

    return NextResponse.json({
      success: true,
      message: 'You now have Admin / Owner access. Refresh the dashboard.',
      userId,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
