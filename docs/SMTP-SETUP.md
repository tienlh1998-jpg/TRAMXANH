# SMTP riêng cho EcoPoint

SMTP xác nhận email và đặt lại mật khẩu được cấu hình tại Supabase, không phải trong mã Next.js hay Vercel. Giữ xác nhận email bật.

## Thông tin cần có từ dịch vụ email

| Trường Supabase | Giá trị cần điền |
| --- | --- |
| Sender email | Email gửi đã được dịch vụ xác thực |
| Sender name | EcoPoint |
| Host | SMTP host của dịch vụ |
| Port | Cổng SMTP do dịch vụ hướng dẫn |
| Username | Tên đăng nhập SMTP |
| Password | Mật khẩu SMTP / khóa dành cho SMTP |

Không dùng khóa `SUPABASE_SERVICE_ROLE_KEY` làm mật khẩu SMTP. Nhập mật khẩu SMTP trực tiếp trong Supabase, không gửi qua chat.

## Cài đặt

1. Chọn dịch vụ hỗ trợ SMTP và xác thực email gửi hoặc tên miền theo hướng dẫn của dịch vụ.
2. Nếu dùng tên miền, thêm các bản ghi DNS mà dịch vụ cung cấp và đợi trạng thái xác thực thành công. Không tự đoán giá trị DNS.
3. Mở đúng dự án Supabase `nftyikwmksnwoqunfxnz`, vào Authentication → cài đặt Email/SMTP, bật Custom SMTP.
4. Điền sáu trường trong bảng, lưu cấu hình.
5. Vào Authentication → Rate Limits để kiểm tra hạn mức email phù hợp số học sinh và hạn mức dịch vụ. SMTP riêng vẫn có giới hạn gửi của Supabase và nhà cung cấp.
6. Giữ Site URL `https://ecopoint-pi.vercel.app` và Redirect URLs `https://ecopoint-pi.vercel.app/auth/callback**`.

## Kiểm tra

Dùng một email thử do bạn kiểm soát: đăng ký → nhận thư → bấm xác nhận trên cùng trình duyệt → vào khu vực học sinh. Tiếp theo dùng Quên mật khẩu và xác nhận đặt lại thành công. Kiểm tra cả hộp thư rác và nhật ký gửi của dịch vụ. Không tạo hàng loạt yêu cầu khi còn lỗi.

Không cần SQL hay triển khai lại Vercel khi chỉ đổi cấu hình SMTP trong Supabase.

Tài liệu: https://supabase.com/docs/guides/auth/auth-smtp
Ví dụ tích hợp Resend: https://resend.com/docs/send-with-supabase-smtp
