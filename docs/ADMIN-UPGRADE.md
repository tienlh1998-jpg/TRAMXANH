# Cập nhật quản trị: email và đơn vị vật liệu

## Bước 1: Chạy SQL

Trong Supabase → SQL Editor, chạy toàn bộ `supabase/migrations/202610090006_admin_units.sql` một lần, sau migration 005. Migration chạy trong transaction: nếu lỗi, toàn bộ thay đổi được hoàn tác.

Lớp học được bỏ khỏi menu quản trị và không còn bắt buộc khi thêm học sinh. Dữ liệu lớp cũ được giữ cho lịch sử và bảng xếp hạng.

## Bước 2: Tạo tài khoản email trực tiếp (tùy chọn cấu hình)

Nếu email đã có trong Supabase Authentication, chỉ cần nhập email tại Tài khoản & học sinh. Hệ thống tự tìm UID và ghi hồ sơ có nhật ký.

Để tạo email mới ngay trên website, thêm biến `SUPABASE_SERVICE_ROLE_KEY` vào Vercel → Project Settings → Environment Variables → Production và Preview. Lấy khóa server/service_role trong Supabase → Project Settings → API Keys. Chỉ lưu trên máy chủ, không đặt tiền tố NEXT_PUBLIC và không đưa vào mã nguồn hay chat.

Khi chạy máy cá nhân, thêm biến tương tự vào `.env.local`. Triển khai lại sau khi cấu hình biến. Không cần thay khóa publishable hiện tại.

Admin nhập email, mật khẩu ban đầu ít nhất 8 ký tự, họ tên, vai trò và mã học sinh. Hệ thống tạo tài khoản email đã được xác nhận theo quy trình admin cấp tài khoản; không gửi thư xác thực. Nếu email đã tồn tại, mật khẩu hiện tại được giữ nguyên. Nếu hồ sơ chưa lưu được sau khi tạo email, gửi lại cùng email để hoàn tất; tài khoản chưa có hồ sơ hoạt động sẽ không vào được khu vực chức năng.

## Bước 3: Vật liệu và phân công

Vật liệu có đơn vị `kg`, `chai`, `thùng`, `lon`, `cái` hoặc đơn vị tự nhập, mức điểm/đơn vị và giới hạn số lượng/lượt. Chỉ `kg` nhận số thập phân (tối đa 3 chữ số); đơn vị đếm nhận số nguyên. Ví dụ: chai nhựa, 2 điểm/chai; gửi 10 chai → chờ duyệt → duyệt 10 chai → cộng 20 điểm.

Không đổi đơn vị của vật liệu đang có yêu cầu chờ duyệt. Có thể xử lý hết yêu cầu hoặc thêm vật liệu mới. Giao dịch đã duyệt giữ đơn vị tại thời điểm gửi, kể cả sau khi danh mục đổi đơn vị. Mức điểm áp dụng khi duyệt theo cấu hình hiện tại.

Báo cáo tổng hợp riêng từng đơn vị. Các chỉ số kg chỉ tính vật liệu ghi theo kg, không cộng chai/thùng vào kg.

Tạo tài khoản vai trò Người giám sát trạm, vào Phân công giám sát, chọn người và trạm rồi lưu. Người đó chỉ duyệt trạm được giao. Admin có quyền trên mọi trạm. Bỏ chọn Phân công để thu hồi quyền.

## Kiểm tra sau triển khai

1. Admin: thu gọn/mở menu trên máy tính và điện thoại; không còn mục Lớp học.
2. Tạo học sinh qua email; đăng nhập bằng tài khoản mới.
3. Tạo vật liệu đơn vị chai, gửi 10 chai; thử nhập 1,5 chai phải bị chặn.
4. Giám sát duyệt số lượng thực tế; gửi/duyệt lại không cộng điểm trùng.
5. Xem yêu cầu, lịch sử, giao dịch, thành quả và báo cáo: hiển thị đúng đơn vị; tổng kg không tăng vì số chai.
