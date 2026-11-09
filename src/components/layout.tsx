import Link from 'next/link';
import { Leaf, UserRound, QrCode, Gift, Trophy, House, LogOut } from 'lucide-react';
import { logout } from '@/app/dang-nhap/actions';

export function Header({ authenticated = false }: { authenticated?: boolean }) {
  return <header className="header"><Link href={authenticated ? '/tai-khoan' : '/'} className="brand"><span className="brand-mark"><Leaf size={25}/></span><span><strong>EcoPoint</strong><small>Đổi rác lấy điểm xanh</small></span></Link>{authenticated ? <form action={logout}><button className="icon-button" aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={20}/></button></form> : <Link className="icon-button" href="/dang-nhap" aria-label="Đăng nhập"><UserRound size={20}/></Link>}</header>;
}
export function BottomNavigation({ preview = false }: { preview?: boolean }) {
  const items = [{ name: 'Trang chủ', href: '/hoc-sinh', icon: House }, { name: 'Đổi quà', href: '/hoc-sinh/qua', icon: Gift }, { name: 'Quét trạm', href: '/hoc-sinh/qr', icon: QrCode }, { name: 'Xếp hạng', href: '/hoc-sinh/xep-hang', icon: Trophy }, { name: 'Tài khoản', href: '/hoc-sinh/tai-khoan', icon: UserRound }];
  return <nav className="bottom-nav" aria-label="Điều hướng học sinh">{items.map(({name, href, icon: Icon}) => <Link key={href} href={preview ? '/dang-nhap' : href} className={href === '/hoc-sinh/qr' ? 'qr-nav' : ''}><Icon size={22}/><span>{name}</span></Link>)}</nav>;
}
export function AppShell({ children, authenticated = false, navigation = false, preview = false, admin=false }: { children: React.ReactNode; authenticated?: boolean; navigation?: boolean; preview?: boolean; admin?:boolean }) {
  return <div className={`app-shell ${admin?'admin-shell':''}`}><Header authenticated={authenticated}/><main className={navigation ? 'with-nav' : ''}>{children}</main>{navigation && <BottomNavigation preview={preview}/>}</div>;
}

