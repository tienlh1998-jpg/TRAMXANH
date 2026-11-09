# Học sinh tự đăng ký và đặt lại mật khẩu

Trang đăng nhập có Đăng ký học sinh, Quên mật khẩu và nút hiện/ẩn mật khẩu. Không cần SQL bổ sung sau migration 006.

Trong Supabase → Authentication → URL Configuration:

- Site URL: `https://ecopoint-pi.vercel.app`
- Redirect URLs: `https://ecopoint-pi.vercel.app/auth/callback` và `https://ecopoint-pi.vercel.app/auth/callback?flow=recovery` (hoặc `https://ecopoint-pi.vercel.app/auth/callback**`).

Trong Authentication → Sign In / Providers → Email, bật đăng ký email nếu đang tắt. Giữ xác nhận email khi muốn học sinh xác nhận sở hữu địa chỉ; nếu tắt xác nhận, đăng ký thành công vào thẳng khu vực học sinh.

Nếu bật xác nhận: học sinh nhập họ tên, email, mật khẩu và nhập lại mật khẩu → xác nhận trong email trên cùng trình duyệt → hệ thống tạo hồ sơ STUDENT hoạt động và mã học sinh tự động. Hồ sơ được tạo dựa trên người dùng đã xác thực, không nhận UID hay quyền từ biểu mẫu. Tài khoản đã có hồ sơ (kể cả bị khóa) không bị tự kích hoạt lại hoặc đổi vai trò.

Quên mật khẩu: nhập email → mở thư trên cùng trình duyệt → đặt mật khẩu mới → đăng nhập lại. Liên kết hết hạn phải yêu cầu mới. Email đã tồn tại không được tiết lộ qua thông báo gửi thư.

Khóa máy chủ SUPABASE_SERVICE_ROLE_KEY dùng riêng để tạo hồ sơ cố định STUDENT sau khi xác thực; không dùng để bỏ qua xác nhận email hoặc cấp quyền quản trị. SMTP và hạn mức gửi thư của Supabase vẫn áp dụng. Có thể cần cấu hình SMTP riêng khi nhiều học sinh đăng ký cùng lúc.

Tham khảo luồng PKCE: https://supabase.com/docs/guides/auth/sessions/pkce-flow
