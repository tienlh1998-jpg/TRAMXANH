import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PointCard, RankingCard, EmptyState } from './ecopoint';
import { StationForm } from './station-form';

export async function StudentHome({classId}:{classId?:string}) {
 const client=await createClient(); const [{data,error},pendingRequests]=await Promise.all([client.rpc('student_dashboard'),client.from('contribution_requests').select('id',{count:'exact',head:true}).eq('status','PENDING')]);
 if(error) return <EmptyState title="Chưa thể tải thành tích" description="Kiểm tra kết nối và thử lại."/>;
 return <><PointCard balance={Number(data.balance)} kilograms={Number(data.kilograms)} approvedCount={Number(data.count)}/>{classId&&<RankingCard>{data.class_rank?`Lớp bạn đang ở hạng ${data.class_rank} theo tổng điểm đóng góp.`:'Lớp chưa có đóng góp được xác nhận.'}</RankingCard>}<section className="student-flow"><h2>Đóng góp tại trạm</h2><p>Quét QR trạm → chọn vật liệu → nhập số lượng → chờ giám sát duyệt.</p><Link href="/hoc-sinh/yeu-cau"><strong>{pendingRequests.error?'Xem yêu cầu':`${pendingRequests.count??0} yêu cầu chờ duyệt`}</strong><span>Theo dõi kết quả và lý do từ chối →</span></Link></section><div className="materials"><article className="material-card"><strong>{data.count}</strong><small>Lượt đã được duyệt</small></article><article className="material-card"><strong>{Number(data.school_kg).toLocaleString('vi-VN')} kg</strong><small>Toàn trường (vật liệu tính kg)</small></article></div><div className="quick-actions"><Link href="/hoc-sinh/qua">Đổi quà</Link><Link href="/hoc-sinh/xep-hang">Xếp hạng</Link><Link href="/hoc-sinh/thanh-qua">Thành quả xanh</Link></div><Link className="button" href="/hoc-sinh/qr">Quét trạm và gửi đóng góp</Link></>;
}
type Contribution = { id: string; created_at: string; weight_kg: number; unit_snapshot:string; points: number; reversed_at: string|null; material_types: {name:string}|null; stations: {name:string}|null };
export async function ContributionHistory({ station = false, from, to, page = 1 }: { station?: boolean; from?: string; to?: string; page?: number }) {
 const client=await createClient(); const safePage=Math.max(1,Math.min(10000,Number.isFinite(page)?Math.floor(page):1));
 let query=client.from('contributions').select('id,created_at,weight_kg,unit_snapshot,points,reversed_at,material_types(name),stations(name)',{count:'exact'}).order('created_at',{ascending:false}).range((safePage-1)*20,safePage*20-1);
 if(from && /^\d{4}-\d{2}-\d{2}$/.test(from) && !Number.isNaN(Date.parse(from))) query=query.gte('created_at',`${from}T00:00:00+07:00`);
 if(to && /^\d{4}-\d{2}-\d{2}$/.test(to) && !Number.isNaN(Date.parse(to))) query=query.lte('created_at',`${to}T23:59:59.999+07:00`);
 const {data,error,count}=await query;
 const rows=(data??[]) as unknown as Contribution[];
 const path=station?'/tram':'/hoc-sinh/lich-su';
 const href=(p:number)=>`${path}?${new URLSearchParams({page:String(p),...(from?{from}:{}),...(to?{to}:{})})}`;
 return <section><h2>{station?'Giao dịch tại trạm':'Lịch sử đóng góp'}</h2><form className="history-filter"><label>Từ ngày<input type="date" name="from" defaultValue={from}/></label><label>Đến ngày<input type="date" name="to" defaultValue={to}/></label><button className="button">Lọc</button></form>{error?<p className="message error">Chưa thể tải lịch sử. Vui lòng thử lại.</p>:rows.length?rows.map(row=><article className="card history-row" key={row.id}><div><strong>{row.material_types?.name??'Vật liệu'}</strong><span className={`history-points ${row.reversed_at?'reversed-points':''}`}>{row.reversed_at?'Đã thu hồi':'+'}{row.reversed_at?' ':''}{row.points} điểm</span></div><p>{new Date(row.created_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</p><p>{row.weight_kg} {row.unit_snapshot} · {row.stations?.name??'Trạm Xanh'}</p>{row.reversed_at&&<p className="message">Giao dịch đã được đảo</p>}<small>Mã: {row.id}</small></article>):<EmptyState title="Chưa có đóng góp" description="Các lượt được trạm xác nhận sẽ xuất hiện ở đây."/>}<div className="two-actions">{safePage>1&&<Link href={href(safePage-1)}>Trang trước</Link>}{(count??0)>safePage*20&&<Link href={href(safePage+1)}>Trang sau</Link>}</div></section>;
}
export async function StationPage() {
 const client=await createClient();
 const [stations,materials,settings]=await Promise.all([client.from('stations').select('id,name').eq('active',true),client.from('material_types').select('id,name,points_per_kg').eq('active',true),client.from('system_settings').select('max_weight_kg').eq('id',true).maybeSingle()]);
 if(stations.error||materials.error||settings.error) return <EmptyState title="Chưa thể tải cấu hình trạm" description="Kiểm tra kết nối và phân quyền Supabase."/>;
 if(!stations.data?.length||!materials.data?.length||!settings.data) return <EmptyState title="Trạm chưa sẵn sàng" description="Người quản lý cần tạo vật liệu, cấu hình quy đổi và phân công trạm. Xem hướng dẫn giai đoạn 2."/>;
 return <StationForm stations={stations.data} materials={materials.data} maxWeight={Number(settings.data.max_weight_kg)}/>;
}
