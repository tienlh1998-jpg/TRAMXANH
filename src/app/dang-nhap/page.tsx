import { AppShell } from '@/components/layout';
import { LoginForm } from '@/components/login-form';
import { supabaseConfig } from '@/lib/supabase/config';
import { Leaf } from 'lucide-react';
import { currentProfile, roleHome } from '@/lib/auth';
import { redirect } from 'next/navigation';
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const configured = Boolean(supabaseConfig());
  const account = await currentProfile();
  if (account) redirect(roleHome[account.profile.role]);
  return <AppShell><div className="login-intro"><span className="login-leaf"><Leaf size={38}/></span><h1>Chào mừng đến EcoPoint</h1><p>Mỗi hành động nhỏ, thêm một giá trị xanh.</p></div>{!configured && <p className="message" role="status">EcoPoint đang được thiết lập. Đăng nhập sẽ mở khi hệ thống kết nối dữ liệu.</p>}{status === 'inactive' && <p className="message error" role="alert">Tài khoản chưa được kích hoạt hoặc chưa được phân quyền. Vui lòng liên hệ người phụ trách.</p>}{status === 'password-reset' && <p className="message success" role="status">Đã đổi mật khẩu. Đăng nhập bằng mật khẩu mới.</p>}{status === 'confirmation' && <p className="message error" role="alert">Liên kết email không hợp lệ hoặc đã hết hạn. Thử đăng nhập nếu đã xác nhận email, hoặc yêu cầu liên kết mới.</p>}<LoginForm configured={configured}/></AppShell>;
}

