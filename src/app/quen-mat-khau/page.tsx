import {AppShell} from '@/components/layout';
import {PasswordResetForm} from '@/components/password-reset-form';
export default function ForgotPassword(){return <AppShell><div className="login-intro"><h1>Quên mật khẩu?</h1><p>Nhập email để nhận liên kết đặt lại mật khẩu.</p></div><PasswordResetForm/></AppShell>;}
