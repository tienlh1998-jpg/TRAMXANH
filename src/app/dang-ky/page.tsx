import {AppShell} from '@/components/layout';
import {RegisterForm} from '@/components/register-form';
import {supabaseConfig} from '@/lib/supabase/config';
export default function RegisterPage(){return <AppShell><div className="login-intro"><h1>Đăng ký EcoPoint</h1><p>Tạo tài khoản học sinh bằng email của bạn.</p></div><RegisterForm configured={Boolean(supabaseConfig()&&process.env.SUPABASE_SERVICE_ROLE_KEY)}/></AppShell>;}
