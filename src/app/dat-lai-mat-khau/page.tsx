import {AppShell} from '@/components/layout';
import {PasswordResetForm} from '@/components/password-reset-form';
import {createClient} from '@/lib/supabase/server';
import {redirect} from 'next/navigation';
export default async function ResetPassword(){const client=await createClient();const {data:{user},error}=await client.auth.getUser();if(error||!user)redirect('/quen-mat-khau');return <AppShell><div className="login-intro"><h1>Đặt mật khẩu mới</h1><p>Chọn mật khẩu có ít nhất 8 ký tự.</p></div><PasswordResetForm update/></AppShell>;}
