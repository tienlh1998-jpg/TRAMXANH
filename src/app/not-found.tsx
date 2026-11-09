import Link from 'next/link';
import { AppShell } from '@/components/layout';
export default function NotFound() { return <AppShell><h1>Không tìm thấy trang</h1><Link className="button" href="/">Về trang chủ</Link></AppShell>; }
