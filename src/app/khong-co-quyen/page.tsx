import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { EmptyState } from '@/components/ecopoint';
export default function Forbidden() { return <AppShell><EmptyState title="Bạn chưa được cấp quyền" description="Khu vực này dành cho vai trò khác. Liên hệ người quản lý nếu bạn cần được phân công."/><Link className="button" href="/tai-khoan">Về khu vực của tôi</Link></AppShell>; }
