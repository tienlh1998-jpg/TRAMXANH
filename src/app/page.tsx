import Link from 'next/link';
import { Gift, Scale, Trophy, Leaf } from 'lucide-react';
import { AppShell } from '@/components/layout';
import { PointCard, MaterialCard, RankingCard } from '@/components/ecopoint';
import {ImpactPage} from '@/components/engagement-pages';
import {currentProfile,roleHome} from '@/lib/auth';
import {redirect} from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const account=await currentProfile();
  if(account)redirect(roleHome[account.profile.role]);
  return <AppShell navigation preview><section className="greeting"><span className="eyebrow green">MỖI ĐÓNG GÓP ĐỀU CÓ GIÁ TRỊ</span><h1>Chào bạn! <span>👋</span></h1><p>Cùng lớp mình tạo nên một trường học xanh.</p></section><PointCard balance={null} kilograms={null} preview/><RankingCard>Đăng nhập để xem thành tích của lớp bạn.</RankingCard><section><div className="section-title"><h2><Leaf size={22}/> Vật liệu được tiếp nhận</h2></div><div className="materials"><MaterialCard name="Nhựa PET" icon="plastic">Chai sạch, đã đổ hết nước</MaterialCard><MaterialCard name="Giấy / bìa" icon="paper">Khô, không dính dầu mỡ</MaterialCard><MaterialCard name="Lon nhôm" icon="can">Sạch, thu gọn an toàn</MaterialCard></div></section><section className="card"><h2>Đổi rác lấy điểm như thế nào?</h2><ol className="steps"><li>Mang rác đã phân loại đến Trạm Xanh.</li><li>Quét QR trạm, chọn vật liệu và nhập số lượng theo đơn vị vật liệu.</li><li>Người giám sát kiểm tra số lượng và duyệt yêu cầu.</li><li>Nhận điểm và tích lũy để đổi quà.</li></ol><p className="muted">QR chỉ giúp nhận diện. Điểm được cộng sau khi người trực xác nhận tiếp nhận rác.</p></section><section><h2>Hoạt động tại trường</h2><div className="quick-actions"><Link href="/dang-nhap"><Scale/>Đổi rác</Link><Link href="/dang-nhap"><Gift/>Đổi quà</Link><Link href="/dang-nhap"><Trophy/>Xếp hạng</Link></div></section><ImpactPage publicView/><section className="card"><h2>Về EcoPoint</h2><p>Dự án do nhóm 5 học sinh thực hiện với sự hỗ trợ kỹ thuật của người lớn, khuyến khích phân loại và thu gom rác tái chế tại trường.</p><Link className="button" href="/dang-nhap">Đăng nhập EcoPoint</Link></section></AppShell>;
}


