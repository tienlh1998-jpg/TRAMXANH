'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfig } from '@/lib/supabase/config';
import { requireProfile, roleHome } from '@/lib/auth';
import {provisionStudent} from '@/lib/student-registration';

export async function login(_previous: { error: string }, form: FormData) {
  if (!supabaseConfig()) return { error: 'Hệ thống chưa kết nối dữ liệu. Vui lòng liên hệ người phụ trách EcoPoint.' };
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password || email.length > 254 || password.length > 256) return { error: 'Vui lòng nhập email và mật khẩu hợp lệ.' };
  const client = await createClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Không thể đăng nhập. Kiểm tra email, mật khẩu hoặc thử lại sau.' };
  const issue=await provisionStudent(client);if(issue)return {error:issue};
  const { profile } = await requireProfile();
  redirect(roleHome[profile.role]);
}
export async function logout() {
  if (supabaseConfig()) { const client = await createClient(); await client.auth.signOut(); }
  redirect('/dang-nhap');
}
