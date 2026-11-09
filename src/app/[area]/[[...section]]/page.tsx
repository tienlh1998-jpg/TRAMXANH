import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout';
import { EmptyState } from '@/components/ecopoint';
import { requireProfile, type Role } from '@/lib/auth';
import { StudentHome, ContributionHistory } from '@/components/contribution-pages';

import Link from 'next/link';
import { RewardsPage, RedemptionsPage, RankingsPage, ImpactPage } from '@/components/engagement-pages';
import { adminSections, AdminDashboard, CatalogPage, AssignmentsPage, ReportPage, TransactionsPage, AuditPage, SettingsPage } from '@/components/admin-pages';
import {AdminWorkspace} from '@/components/admin-workspace';
import {StationQrPage} from '@/components/admin-pages';
import {StudentStation} from '@/components/student-station';
import {RequestList} from '@/components/request-pages';

const areas: Record<string, { roles: Role[]; title: string }> = {
  'hoc-sinh': { roles: ['STUDENT'], title: 'Khu vực học sinh' },
  tram: { roles: ['STATION_OPERATOR', 'ADMIN'], title: 'Trạm Xanh' },
  'giao-vien': { roles: ['TEACHER', 'ADMIN'], title: 'Khu vực giáo viên' },
  'quan-tri': { roles: ['ADMIN'], title: 'Quản trị EcoPoint' },
};
const sections: Record<string,string> = { qr: 'Quét QR trạm', 'yeu-cau':'Yêu cầu đóng góp', 'qua': 'Đổi quà', 'phieu-qua':'Phiếu nhận quà', 'thanh-qua':'Thành quả xanh', 'lich-su': 'Lịch sử đóng góp', 'xep-hang': 'Xếp hạng lớp', 'tai-khoan': 'Tài khoản' };
export default async function RolePage({ params, searchParams }: { params: Promise<{ area: string; section?: string[] }>; searchParams: Promise<{from?:string;to?:string;page?:string;period?:string;status?:string;edit?:string;q?:string;class?:string}> }) {
  const { area, section } = await params;
  const config = areas[area];
  if (!config || (section && (section.length !== 1 || !(area==='hoc-sinh' && sections[section[0]] || area==='quan-tri'&&(adminSections[section[0]]||section[0]==='qr-tram'))))) notFound();
  const { profile, client } = await requireProfile(config.roles);
  const { data: classroom } = profile.class_id ? await client.from('classes').select('name').eq('id', profile.class_id).single() : { data: null };
  const filters=await searchParams;
  let content: React.ReactNode;
  if(area==='quan-tri'&&!section) content=<AdminDashboard/>;
  else if(area==='quan-tri'&&section?.[0]==='qr-tram') content=<StationQrPage/>;
  else if(area==='quan-tri'&&['hoc-sinh','lop','vat-lieu','tram','qua'].includes(section?.[0]??'')) content=<CatalogPage section={section![0]} edit={filters.edit} q={filters.q} page={Number(filters.page??1)}/>;
  else if(area==='quan-tri'&&section?.[0]==='phan-cong') content=<AssignmentsPage/>;
  else if(area==='quan-tri'&&section?.[0]==='bao-cao') content=<ReportPage from={filters.from} to={filters.to} classId={filters.class}/>;
  else if(area==='quan-tri'&&section?.[0]==='giao-dich') content=<TransactionsPage page={Number(filters.page??1)}/>;
  else if(area==='quan-tri'&&section?.[0]==='nhat-ky') content=<AuditPage page={Number(filters.page??1)}/>;
  else if(area==='quan-tri'&&section?.[0]==='cau-hinh') content=<SettingsPage/>;
  else if(area==='giao-vien') content=<ReportPage teacher from={filters.from} to={filters.to}/>;
  else if(area==='tram') content=<><RequestList supervisor page={Number(filters.page??1)}/><ContributionHistory station from={filters.from} to={filters.to}/></>;
  else if(area==='hoc-sinh'&&!section) content=<StudentHome classId={profile.class_id??undefined}/>;
  else if(area==='hoc-sinh'&&section?.[0]==='qua') content=<RewardsPage/>;
  else if(section?.[0]==='phieu-qua') content=<RedemptionsPage admin={area==='quan-tri'} page={Number(filters.page??1)} status={filters.status}/>;
  else if(area==='hoc-sinh'&&section?.[0]==='xep-hang') content=<RankingsPage period={filters.period} classId={profile.class_id??undefined}/>;
  else if(area==='hoc-sinh'&&section?.[0]==='thanh-qua') content=<ImpactPage/>;
  else if(area==='hoc-sinh'&&section?.[0]==='qr') content=<><StudentStation/><Link className="button" href="/hoc-sinh/yeu-cau">Xem yêu cầu của tôi</Link></>;
  else if(area==='hoc-sinh'&&section?.[0]==='yeu-cau') content=<RequestList page={Number(filters.page??1)}/>;
  else if(area==='hoc-sinh'&&section?.[0]==='lich-su') content=<ContributionHistory from={filters.from} to={filters.to} page={Number(filters.page??1)}/>;
  else if(section?.[0]==='tai-khoan') content=<section className="card"><h2>Thông tin tài khoản</h2><p>Họ tên: {profile.full_name}</p><p>Email: {(await client.auth.getUser()).data.user?.email??'Chưa có'}</p><p>Mã học sinh: {profile.student_code??'Chưa được cấp'}</p><p className="muted">Bạn quét QR tại trạm để gửi đóng góp. Mã học sinh dùng để người phụ trách đối chiếu tài khoản.</p><Link className="button" href="/hoc-sinh/yeu-cau">Yêu cầu của tôi</Link><Link className="button" href="/hoc-sinh/phieu-qua">Phiếu nhận quà</Link><Link className="edit-link" href="/dat-lai-mat-khau">Đổi mật khẩu</Link><Link className="button" href="/hoc-sinh/lich-su">Lịch sử đóng góp</Link></section>;
  else content=<><EmptyState title={section ? sections[section[0]] : 'Nền tảng tài khoản đã sẵn sàng'} description="Chức năng này sẽ được triển khai ở giai đoạn tiếp theo sau khi được phê duyệt."/>{area==='quan-tri'&&<><Link className="button" href="/tram">Mở màn hình tiếp nhận tại trạm</Link><Link className="button" href="/quan-tri/phieu-qua">Xử lý phiếu nhận quà</Link></>}</>;
  const greeting=<section className="greeting"><span className="eyebrow green">{config.title}</span><h1>{area==='quan-tri'?(section?adminSections[section[0]]??'QR in tại trạm':'Tổng quan chương trình'):`Chào ${profile.full_name}!`}</h1>{area==='quan-tri'&&<p>Xin chào {profile.full_name}. Quản lý hoạt động EcoPoint tại đây.</p>}{classroom&&<p>Lớp {classroom.name}</p>}</section>;
  return <AppShell authenticated admin={area==='quan-tri'} navigation={area==='hoc-sinh'}>{area==='quan-tri'?<AdminWorkspace>{greeting}{content}</AdminWorkspace>:<>{greeting}{content}</>}</AppShell>;
}

