'use client';
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {processRedemption} from '@/app/reward-actions';
import {ConfirmDialog} from './confirm-dialog';
export function RedemptionControl({id,name}:{id:string;name:string}){
 const [action,setAction]=useState<'COLLECTED'|'CANCELLED'|null>(null);const [reason,setReason]=useState('');const [error,setError]=useState('');const [pending,start]=useTransition();const router=useRouter();
 function save(){if(!action)return;start(async()=>{try{const r=await processRedemption(id,action,reason);setError(r.error);if(!r.error){setAction(null);router.refresh();}}catch{setError('Chưa thể xử lý. Thử lại để kiểm tra kết quả.');}});}
 return <><div className="two-actions"><button disabled={pending} onClick={()=>{setError('');setAction('COLLECTED');}}>Đã giao quà</button><button disabled={pending} onClick={()=>{setError('');setReason('');setAction('CANCELLED');}}>Hủy / hoàn điểm</button></div><ConfirmDialog open={Boolean(action)} title={action==='COLLECTED'?'Xác nhận đã giao quà':'Hủy phiếu và hoàn điểm'} pending={pending} onCancel={()=>setAction(null)} onConfirm={save}><p>{name}</p>{action==='COLLECTED'?<p>Chỉ xác nhận sau khi đối chiếu mã phiếu và giao quà cho học sinh.</p>:<><label htmlFor={`reason-${id}`}>Lý do hủy</label><textarea id={`reason-${id}`} value={reason} maxLength={500} onChange={e=>setReason(e.target.value)} placeholder="Nhập lý do hủy phiếu"/><p className="muted">Hoàn lại điểm và số lượng quà đúng một lần.</p></>}{error&&<p className="message error" role="alert">{error}</p>}</ConfirmDialog></>;
}
