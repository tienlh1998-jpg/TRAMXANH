'use client';
import { useEffect, useState, useTransition } from 'react';
import Image from 'next/image';
import { issueQr } from '@/app/contribution-actions';
export function StudentQr({ name, classroom, code }: { name: string; classroom?: string; code?: string }) {
 const [qr,setQr] = useState<{ image: string; expiresAt: string } | null>(null);
 const [remaining,setRemaining] = useState(0);
 const [error,setError] = useState('');
 const [pending,start] = useTransition();
 useEffect(() => { if (!qr) return; const update=()=>setRemaining(Math.max(0,Math.ceil((Date.parse(qr.expiresAt)-Date.now())/1000))); update(); const timer=setInterval(update,1000); return ()=>clearInterval(timer); },[qr]);
 function generate() { start(async()=> { try { const result=await issueQr(); setError(result.error); if(result.image && result.expiresAt) setQr({image:result.image,expiresAt:result.expiresAt}); } catch { setError('Chưa thể tạo QR. Vui lòng thử lại.'); } }); }
 return <section className="card qr-card"><h2>QR cá nhân</h2><strong>{name}</strong><p>{classroom ? `Lớp ${classroom}` : 'Chưa gán lớp'} · {code ?? 'Chưa cấp mã'}</p>{qr && remaining>0 ? <><Image src={qr.image} width={280} height={280} alt="QR nhận diện tại Trạm Xanh" unoptimized/><p role="status">Có hiệu lực trong {remaining} giây</p></> : <p className="message">{qr ? 'QR đã hết hạn. Hãy tạo mã mới.' : 'Tạo mã khi bạn đến Trạm Xanh.'}</p>}{error && <p role="alert" className="message error">{error}</p>}<button className="button" disabled={pending} onClick={generate}>{pending?'Đang tạo…':'Tạo QR mới'}</button><p className="muted">Đưa QR cho người trực. QR chỉ nhận diện học sinh; điểm được cộng sau khi cân và xác nhận. Mã mới thay thế mã cũ.</p></section>;
}
