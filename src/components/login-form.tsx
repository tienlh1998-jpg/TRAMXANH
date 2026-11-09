'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import {PasswordInput} from './password-input';
import { login } from '@/app/dang-nhap/actions';
export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(login, { error: '' });
  return <form action={action} className="login-form"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" maxLength={254} placeholder="Email của bạn" required/><label htmlFor="password">Mật khẩu</label><PasswordInput/>{state.error && <p className="message error" role="alert">{state.error}</p>}<button className="button" disabled={pending || !configured}>{pending ? 'Đang đăng nhập…' : 'Đăng nhập'}</button><Link className="auth-link" href="/quen-mat-khau">Quên mật khẩu?</Link><div className="auth-register"><p>Chưa có tài khoản?</p><Link className="button secondary-button" href="/dang-ky">Đăng ký học sinh</Link></div></form>;
}

