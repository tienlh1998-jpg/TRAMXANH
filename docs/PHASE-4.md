# Giai đoạn 4 — Quản trị

## Cài đặt

Trong SQL Editor của Supabase đã cài migrations 001–003, chạy **một lần** toàn bộ `supabase/migrations/202610080004_administration.sql`. Không chạy lại migrations cũ. Không có seed mới, không tự thay đổi dữ liệu pilot.

Migration thêm before/after cho nhật ký, bảng nội bộ chống gửi trùng thao tác danh mục và năm RPC quản trị/báo cáo. Quyền ghi trực tiếp từ trình duyệt vẫn bị chặn. Mọi thao tác phải qua RPC với tài khoản ADMIN đang hoạt động. TEACHER chỉ được gọi báo cáo giới hạn theo lớp đã phân công.

Tải lại `/quan-tri` để thấy dashboard và menu quản lý.

## Chức năng

- **Tài khoản & học sinh**: tìm tên/mã, chỉnh họ tên, vai trò, lớp, mã, kích hoạt/khóa. Thêm hồ sơ bằng UID tài khoản đã được tạo trong Supabase Authentication. Không lưu mật khẩu/email trong profiles. Tạo và đặt lại mật khẩu Auth vẫn do người quản lý thao tác trong Supabase Dashboard; ứng dụng không yêu cầu secret/service-role key.
- **Lớp**: thêm/sửa, năm học, hoạt động; mở báo cáo lớp.
- **Vật liệu**: tên, điểm/kg, hoạt động. Đơn vị là kg. Điểm/kg mới chỉ áp dụng giao dịch tiếp theo; lịch sử giữ mức đã ghi.
- **Trạm**: thêm/sửa tên, vị trí và trạng thái. Phụ trách trạm được quản lý tại Phân công.
- **Phần thưởng**: tên, mô tả, đường dẫn ảnh, giá điểm, hoạt động. Tồn kho được điều chỉnh bằng số lượng tăng/giảm; không ghi đè tồn kho hiện tại. Chặn tồn kho âm. Phiếu cũ giữ tên và giá điểm tại thời điểm đổi.
- **Phân công**: cấp/thu hồi trạm cho STATION_OPERATOR, lớp cho TEACHER. Người không đúng vai trò bị chặn. Tài khoản bị khóa không còn sử dụng được quyền đã phân công.
- **Cấu hình**: giới hạn khối lượng 0,001–1000 kg; QR 30–600 giây. Làm tròn xuống điểm nguyên. Thay đổi không sửa lịch sử hoặc thời hạn QR đã cấp.
- **Báo cáo**: khoảng ngày theo giờ Việt Nam, kg, lượt, người tham gia, điểm hợp lệ, điểm đổi chưa hủy; nhóm theo lớp/trạm/vật liệu/ngày/tháng. Báo cáo giáo viên chỉ gồm lớp được phân công, không hiển thị dữ liệu đổi quà cá nhân.
- **Dashboard**: tổng học sinh, lượt, kg, điểm đóng góp hợp lệ, điểm đổi và giao dịch gần đây.
- **Giao dịch & xử lý sai**: kiểm tra biên nhận, chọn Xử lý giao dịch sai, xác nhận và nhập lý do. Ghi giao dịch REVERSAL, giữ đóng góp gốc và loại khỏi thống kê; không xóa lịch sử. Sau đó ghi lại lượt đúng tại trạm nếu cần.
- **Nhật ký**: ai thay đổi, thời gian, lý do, đối tượng, dữ liệu trước/sau; phân trang. Phiếu quà giữ chức năng giao/hủy ở giai đoạn 3.

Sau khi lưu biểu mẫu, dùng nút **Tải lại để tiếp tục quản lý** nếu cần sửa tiếp. Mỗi thao tác danh mục có mã yêu cầu riêng giúp retry an toàn khi mất mạng, đặc biệt khi tăng tồn kho.

## Xử lý điểm đã dùng

Không để số dư âm khi đảo đóng góp. Nếu học sinh đã tiêu điểm, hệ thống từ chối đảo cho đến khi số dư đủ để thu hồi. Admin có thể hủy phiếu đang Chờ nhận để hoàn điểm rồi đảo đóng góp. Phiếu Đã nhận không được hủy tự động; trường hợp này cần xử lý theo quy trình của chương trình, không cộng điểm tùy tiện.

Không cho admin tự khóa hoặc tự đổi vai trò của mình, để tránh mất quyền vận hành.

## Kiểm tra sau cài đặt

1. Tạo lớp thử, chỉnh tên/năm học, xác nhận nhật ký trước/sau.
2. Tạo user Auth thử; nhập UID để tạo profile STUDENT, mã và lớp. Khóa rồi thử đăng nhập; mở khóa để sử dụng lại.
3. Đổi điểm/kg, ghi đóng góp mới và đối chiếu lịch sử cũ không đổi.
4. Tăng tồn kho quà +2, gửi lại cùng yêu cầu: chỉ tăng một lần; giảm quá tồn kho bị chặn.
5. Phân công giáo viên cho một lớp, đăng nhập giáo viên tại `/giao-vien` và kiểm tra chỉ thấy lớp đó.
6. Phân công người trực trạm và kiểm tra chỉ xác nhận tại trạm được phân công.
7. Với một đóng góp chưa tiêu điểm: đảo, đối chiếu số dư, dashboard/xếp hạng/thành quả, và nhật ký. Gửi lại không trừ điểm thêm.
8. Với đóng góp đã tiêu điểm: xác nhận đảo bị chặn; hoàn phiếu đang chờ rồi thử lại.

Kiểm thử tự động chạy cả bốn migrations trên PostgreSQL nhúng, kiểm tra quyền, nhật ký trước/sau, chống trùng tồn kho, phạm vi báo cáo, khóa tài khoản và đảo giao dịch. Các thao tác đăng nhập trên Supabase thật cần kiểm tra sau cài SQL. Chưa triển khai lên Vercel.
