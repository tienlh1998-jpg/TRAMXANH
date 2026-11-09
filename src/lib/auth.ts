import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { supabaseConfig } from './supabase/config';

export type Role = 'STUDENT' | 'STATION_OPERATOR' | 'TEACHER' | 'ADMIN';
export const roleHome: Record<Role, string> = { STUDENT: '/hoc-sinh', STATION_OPERATOR: '/tram', TEACHER: '/giao-vien', ADMIN: '/quan-tri' };
export async function currentProfile(ignoreInactive = true) {
  if (!supabaseConfig()) return null;
  const client = await createClient();
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const { data: profile, error: profileError } = await client.from('profiles').select('id, full_name, role, class_id, student_code, active').eq('id', data.claims.sub).single();
  if (profileError && profileError.code !== 'PGRST116') throw new Error('Không thể tải hồ sơ. Vui lòng thử lại.');
  if (!profile || !profile.active || !(profile.role in roleHome)) {
    if (!ignoreInactive) redirect('/dang-nhap?status=inactive');
    return null;
  }
  const role = profile.role as Role;
  return { client, profile: { ...profile, role } };
}
export async function requireProfile(allowed?: Role[]) {
  if (!supabaseConfig()) redirect('/dang-nhap?status=setup');
  const account = await currentProfile(false);
  if (!account) redirect('/dang-nhap');
  const { profile } = account;
  const role = profile.role;
  if (allowed && !allowed.includes(role)) redirect('/khong-co-quyen');
  return account;
}
