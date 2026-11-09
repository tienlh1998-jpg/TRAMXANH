import { redirect } from 'next/navigation';
import { requireProfile, roleHome } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function AccountRouter() { const { profile } = await requireProfile(); redirect(roleHome[profile.role]); }
