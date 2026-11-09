# Triển khai Vercel và chuẩn bị pilot

## Hai môi trường

- Thử nghiệm: dùng Supabase phát triển hiện tại, dữ liệu mẫu và link thử. Không gọi đây là pilot thực tế.
- Pilot: tạo project Supabase riêng; chạy migrations 001 → 004, không chạy seed development. Admin thêm lớp/trạm/vật liệu/quà với mức chính thức. Tạo tài khoản riêng; không mang điểm/giao dịch demo sang pilot và không xóa dữ liệu phát triển để giả lập dự án mới.

Không có migration mới trong giai đoạn 5. Trước pilot cần chốt tên trường/logo, giờ mở trạm, mức điểm/kg và giới hạn kg, quà/nguồn kinh phí, người phụ trách, nơi chứa rác và đơn vị nhận rác.

## Triển khai bằng Vercel CLI (không bắt buộc GitHub)

Tại thư mục chứa package.json, đăng nhập tài khoản Vercel của người quản lý:

```powershell
cd D:\THPT\TRAMXANH
npx vercel login
npx vercel link
```

Chọn hoặc tạo project EcoPoint. Sau đó thêm hai biến cho Preview bằng lệnh tương tác (dán giá trị khi CLI hỏi, không đặt khóa trong lệnh):

```powershell
npx vercel env add NEXT_PUBLIC_SUPABASE_URL preview
npx vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY preview
npx vercel deploy
```

Project URL là địa chỉ gốc `https://…supabase.co`, không thêm `/rest/v1/`. Khóa là publishable key. Không thêm service-role/secret key. `.vercelignore` loại .env, node_modules, bản xuất Stitch, tệp zip và kết quả thử; cấu hình môi trường cần thêm trong Vercel.

Link Preview có thể yêu cầu đăng nhập Vercel tùy cấu hình Deployment Protection. Kiểm tra thiết lập truy cập khi mời người khác thử. Sau khi kiểm thử link và chốt môi trường Production, thêm hai biến cho Production rồi triển khai:

```powershell
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
npx vercel deploy --prod
```

Nếu dùng GitHub: tạo repository riêng, chỉ đẩy mã nguồn và package-lock; không đẩy .env hoặc node_modules. Import repository vào Vercel, chọn Next.js, thêm cùng hai biến môi trường cho đúng môi trường và Deploy. Gốc dự án là thư mục chứa package.json.

## Sau triển khai

Trong Supabase Authentication → URL Configuration, đặt Site URL bằng link chính thức HTTPS. Chỉ thêm Redirect URLs cụ thể nếu dùng luồng Auth cần callback. Giữ đăng ký tự do tắt. Tạo tài khoản admin thật với mật khẩu riêng, kích hoạt profile; kiểm tra tất cả vai trò. Khi đổi biến NEXT_PUBLIC phải build/deploy lại.

Kiểm tra trên điện thoại thật: đăng nhập, QR/camera, nhập kg, đóng góp, đổi quà, giao/hủy phiếu, bảng xếp hạng, báo cáo. Các kiểm thử tại máy không thay thế kiểm tra HTTPS và camera thật.

## Kiểm tra trước phát hành

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:ui
```

Giữ lịch sử migrations và nhật ký; thiết lập sao lưu phù hợp với gói Supabase của trường. Khi có bản phát hành lỗi, dùng bản triển khai Vercel trước đó và đánh giá tương thích database; không tự xóa/rollback dữ liệu điểm. Không chạy seed thử nghiệm trên project pilot.

## Tài liệu chính thức

- https://vercel.com/docs/projects/deploy-from-cli
- https://vercel.com/docs/cli/env
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
