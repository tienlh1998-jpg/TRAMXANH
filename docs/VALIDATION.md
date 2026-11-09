# Kiểm tra hoàn thiện — 08/10/2026

## Đã kiểm tra tại máy

- Lint, TypeScript và build production: đạt.
- Bốn bộ kiểm thử PostgreSQL nhúng chạy migrations 001–004: quyền đọc/ghi, tài khoản khóa, QR hết hạn/dùng lại, không nhận điểm từ nhận diện, làm tròn điểm, chống cộng/trừ trùng, thiếu điểm/hết hàng, hoàn điểm một lần, rollback lỗi ledger, phạm vi giáo viên, nhật ký và đảo đóng góp.
- Kiểm thử trình duyệt: khung mobile/desktop, chặn các đường dẫn riêng với phiên chưa đăng nhập, căn giữa QR, không tràn ngang ở 320px, thông báo offline và HTTP headers.
- Audit dependencies chạy website: không có cảnh báo. Audit toàn bộ còn các cảnh báo dev-tool đã ghi trong README; không tự hạ Next.js.
- Người dùng đã xác nhận các luồng giai đoạn 2/3 hoạt động trên Supabase thật; đã xác nhận lỗi điều hướng đăng nhập được sửa.

## Chưa xác nhận thay cho kiểm tra thực tế

- Luồng admin/giáo viên đầy đủ trên Supabase sau migration 004.
- Camera trên điện thoại thật qua HTTPS.
- Đăng nhập đúng/sai với tài khoản thật trong bộ test tự động: không có mật khẩu dùng để tự chạy; không lưu mật khẩu test trong repository.
- Vercel Preview/Production: máy chưa có liên kết project hay thông tin đăng nhập CLI, chưa có URL triển khai.
- Mức quy đổi/quà/giờ mở cửa/đơn vị nhận rác/kinh phí pilot chính thức.

Không có service worker hoặc hàng đợi offline: giao dịch điểm bắt buộc kết nối database. Không tự chạy migration trên cloud, không xóa dữ liệu thử nghiệm, không trộn vào pilot.
