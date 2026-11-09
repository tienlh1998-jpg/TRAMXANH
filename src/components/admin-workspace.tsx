'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {Menu, X, LayoutDashboard, Users, Recycle, MapPin, Gift, UserCheck, ChartColumn, Receipt, History, Settings, QrCode, Ticket} from 'lucide-react';
const entries=[['','Tổng quan',LayoutDashboard],['hoc-sinh','Tài khoản & học sinh',Users],['vat-lieu','Vật liệu',Recycle],['tram','Trạm Xanh',MapPin],['qr-tram','QR in tại trạm',QrCode],['qua','Phần thưởng',Gift],['phieu-qua','Phiếu nhận quà',Ticket],['phan-cong','Phân công giám sát',UserCheck],['bao-cao','Báo cáo',ChartColumn],['giao-dich','Giao dịch & xử lý',Receipt],['nhat-ky','Nhật ký quản trị',History],['cau-hinh','Cấu hình quy đổi',Settings]] as const;
export function AdminWorkspace({children}:{children:React.ReactNode}){
 const [open,setOpen]=useState(true);const pathname=usePathname();
 return <div className={`admin-workspace ${open?'menu-open':'menu-closed'}`}><button className="admin-menu-toggle" aria-expanded={open} aria-controls="admin-sidebar" onClick={()=>setOpen(!open)}>{open?<X size={18}/>:<Menu size={18}/>} {open?'Thu gọn danh mục':'Mở danh mục'}</button>{open&&<aside id="admin-sidebar" className="admin-sidebar"><div className="sidebar-heading">QUẢN TRỊ<span>Điều hành chương trình</span></div><nav aria-label="Quản trị">{entries.map(([key,label,Icon])=>{const href=`/quan-tri${key?'/'+key:''}`;return <Link key={key} href={href} aria-current={pathname===href?'page':undefined}><Icon size={18}/><span>{label}</span></Link>;})}</nav><Link className="sidebar-review" href="/tram">Mở hàng chờ duyệt →</Link></aside>}<div className="admin-content">{children}</div></div>;
}
