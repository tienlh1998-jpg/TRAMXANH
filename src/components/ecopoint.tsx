import { Leaf, History, QrCode, Recycle, BookOpen, Package, Trophy, Gift } from 'lucide-react';
import Link from 'next/link';

export function PointCard({ balance, kilograms, preview = false,approvedCount }: { balance: number | null; kilograms: number | null; preview?: boolean;approvedCount?:number }) {
  return <section className="point-card"><div className="eyebrow"><Leaf size={17}/> ĐIỂM XANH CỦA BẠN</div><div className="point-value">{balance === null ? '—' : balance.toLocaleString('vi-VN')} <span>EcoPoints</span></div><p>{approvedCount!==undefined?`${approvedCount.toLocaleString('vi-VN')} lượt đóng góp đã được duyệt`:kilograms === null ? 'Khối lượng sẽ hiển thị sau khi trạm xác nhận.' : `${kilograms.toLocaleString('vi-VN')} kg đã được tiếp nhận`}</p><div className="point-note">Điểm được cộng sau khi người giám sát duyệt yêu cầu.</div><div className="two-actions"><Link href={preview ? '/dang-nhap' : '/hoc-sinh/qr'}><QrCode size={18}/> Quét trạm</Link><Link href={preview ? '/dang-nhap' : '/hoc-sinh/lich-su'}><History size={18}/> Lịch sử</Link></div></section>;
}
export function MaterialCard({ name, icon, children }: { name: string; icon: 'plastic' | 'paper' | 'can'; children: React.ReactNode }) {
  const Icon = icon === 'plastic' ? Recycle : icon === 'paper' ? BookOpen : Package;
  return <article className={`material-card ${icon}`}><Icon size={23}/><strong>{name}</strong><small>{children}</small></article>;
}
export function RankingCard({ children }: { children: React.ReactNode }) { return <section className="ranking-card"><Trophy size={27}/><div><strong>Thành tích của lớp</strong><p>{children}</p></div></section>; }
export function RewardCard({ name, points, stock }: { name: string; points: number; stock: number }) { return <article className="card"><Gift/><h3>{name}</h3><p>{points} EcoPoints · Còn {stock}</p></article>; }
export function EmptyState({ title, description }: { title: string; description: string }) { return <section className="empty-state"><Leaf size={28}/><h3>{title}</h3><p>{description}</p></section>; }
export function LoadingState() { return <div className="empty-state" role="status"><span className="spinner"/>Đang tải dữ liệu…</div>; }
export function SuccessMessage({ children }: { children: React.ReactNode }) { return <p className="message success" role="status">{children}</p>; }

