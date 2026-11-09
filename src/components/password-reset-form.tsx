'use client';
import {useActionState} from 'react';
import Link from 'next/link';
import {requestReset} from '@/app/quen-mat-khau/actions';
import {updatePassword} from '@/app/dat-lai-mat-khau/actions';
import {PasswordInput} from './password-input';
export function PasswordResetForm({update=false}:{update?:boolean}){const [state,action,pending]=useActionState(update?updatePassword:requestReset,{error:'',success:''});return <form action={action} className="login-form"><fieldset disabled={pending}>{update?<><label htmlFor="password">Mật khẩu mới</label><PasswordInput minLength={8} autoComplete="new-password"/><label htmlFor="confirm-password">Nhập lại mật khẩu mới</label><PasswordInput id="confirm-password" name="confirm_password" minLength={8} autoComplete="new-password"/></>:<><label htmlFor="email">Email tài khoản</label><input id="email" name="email" type="email" required maxLength={254} autoComplete="email"/></>}{state.error&&<p className="message error" role="alert">{state.error}</p>}{state.success&&<p className="message success" role="status">{state.success}</p>}<button className="button" disabled={pending}>{pending?'Đang xử lý…':update?'Lưu mật khẩu mới':'Gửi liên kết đặt lại'}</button></fieldset><Link className="auth-link" href="/dang-nhap">Quay lại đăng nhập</Link></form>;}
