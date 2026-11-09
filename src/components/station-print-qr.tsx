'use client';
import Image from 'next/image';
import {useState,useTransition} from 'react';
import {stationPrintQr} from '@/app/station-qr-actions';
export function StationPrintQr({stations}:{stations:{id:string;name:string}[]}){
 const [selected,setSelected]=useState(stations[0]?.id??'');const [qr,setQr]=useState<{name:string;location:string|null;image:string}|null>(null);const [error,setError]=useState('');const [pending,start]=useTransition();
 function generate(){start(async()=>{try{const result=await stationPrintQr(selected);setError(result.error);setQr(result.qr);}catch{setError('Chưa thể tạo mã trạm. Vui lòng thử lại.');}});}
 return <section className="card station-form"><div className="no-print"><h2>QR in tại trạm</h2><label htmlFor="print-station">Chọn trạm</label><select id="print-station" value={selected} onChange={e=>{setSelected(e.target.value);setQr(null);}}>{stations.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><button className="button" disabled={!selected||pending} onClick={generate}>{pending?'Đang tạo…':'Tạo mã QR trạm'}</button>{error&&<p className="message error" role="alert">{error}</p>}</div>{qr&&<><div className="station-print-card"><h2>EcoPoint</h2><h3>{qr.name}</h3>{qr.location&&<p>{qr.location}</p>}<Image src={qr.image} alt={`QR ${qr.name}`} width={300} height={300} unoptimized/><p>Học sinh quét mã tại trạm để khai báo rác tái chế.</p></div><div className="two-actions no-print"><a href={qr.image} download="ecopoint-qr-tram.png">Lưu ảnh PNG</a><button onClick={()=>window.print()}>In mã trạm</button></div><p className="muted no-print">Mã chỉ chứa định danh trạm, không chứa thông tin học sinh. Trạm bị ngừng hoạt động không tiếp nhận yêu cầu mới.</p></>}</section>;
}
