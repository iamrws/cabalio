import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

export default async function ProfileMeRedirectPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    redirect('/');
  }

  redirect(`/profile/${session.walletAddress}`);
}
