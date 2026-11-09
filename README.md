# EcoPoint

**Luồng hiện tại:** học sinh quét QR trạm và gửi kg; người giám sát duyệt rồi mới cộng điểm. Admin tạo/tải/in QR tại `/quan-tri/qr-tram`. Cài migration 005 theo [docs/STATION-QR.md](docs/STATION-QR.md). Các hướng dẫn giai đoạn trước mô tả luồng QR cá nhân cũ.

Hướng dẫn sử dụng: [docs/OPERATIONS.md](docs/OPERATIONS.md). Triển khai Vercel và tách môi trường pilot: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Ứng dụng Next.js, giao diện nền dựa trên Stitch, đăng nhập Supabase và bốn khu vực có kiểm tra vai trò tại máy chủ. Giai đoạn 2 bổ sung QR học sinh, tiếp nhận rác, cộng điểm nguyên tử, dashboard và lịch sử. Giai đoạn 3 bổ sung đổi quà, xử lý phiếu, xếp hạng lớp và thành quả xanh. Giai đoạn 4 bổ sung quản trị danh mục/tài khoản, phân công, báo cáo có giới hạn phạm vi và đảo đóng góp có nhật ký. Không có số liệu giả hoặc đăng nhập giả.

**Cài đặt giai đoạn 2:** xem [docs/PHASE-2.md](docs/PHASE-2.md). Phải chạy migration 002 trên Supabase đã cài migration 001; không chạy lại migration 001.

**Cài đặt giai đoạn 3:** xem [docs/PHASE-3.md](docs/PHASE-3.md). Chạy migration 003, sau đó seed quà chỉ trong môi trường phát triển.

**Cài đặt giai đoạn 4:** xem [docs/PHASE-4.md](docs/PHASE-4.md). Chạy migration 004 để bật danh mục, phân công, báo cáo giáo viên/admin và đảo đóng góp có nhật ký. Tạo user Auth vẫn qua Supabase Dashboard, sau đó có thể tạo/kích hoạt profile ngay trong website.

## Chạy trên máy

Yêu cầu Node.js 22 trở lên.

```powershell
npm ci
npm run dev
```

Mở http://localhost:3000. Khi chưa có cấu hình Supabase, trang công khai vẫn hoạt động; đăng nhập bị vô hiệu hóa và trang riêng chuyển về trang đăng nhập.

## Tạo Supabase phát triển

1. Tạo một project phát triển riêng trên Supabase, đặt mật khẩu database ngẫu nhiên và lưu trong trình quản lý mật khẩu. Chọn vùng phù hợp gần Việt Nam.
2. Trong Authentication, tắt **Allow new users to sign up**. Chỉ người quản lý tạo tài khoản. Không dùng metadata người dùng để cấp vai trò.
3. Trong Authentication URL Configuration, đặt Site URL là `http://localhost:3000`. Chỉ thêm URL triển khai chính thức khi triển khai.
4. Chạy toàn bộ `supabase/migrations/202610080001_foundation.sql` trong SQL Editor của project mới. Không chạy lên cơ sở dữ liệu đang có dữ liệu mà chưa kiểm tra.
5. Sao chép `.env.example` thành `.env.local`. Điền Project URL và publishable key vào hai biến. Không đưa secret/service-role key vào frontend hoặc Git.
6. Tạo tài khoản thử nghiệm bằng Authentication → Users. Lấy User ID để tạo profile qua SQL Editor. Ví dụ dưới đây là mẫu: thay UUID và tên, không chạy nguyên văn.

```sql
insert into public.profiles(id, full_name, role, active)
values ('UUID-CUA-TAI-KHOAN', 'Tên người quản lý', 'ADMIN', true);
```

Học sinh cần profile STUDENT, mã học sinh và lớp. Người trực cần STATION_OPERATOR và bản ghi `station_assignments`; giáo viên cần TEACHER và `teacher_class_assignments`. Không dùng chung tài khoản hay mật khẩu cố định. Không có signup công khai, màn hình quên mật khẩu hoặc chức năng cấp tài khoản tự động trong giai đoạn 1; người quản lý xử lý trong dashboard Supabase.

Khởi động lại `npm run dev` sau khi thay cấu hình. Đăng nhập để kiểm tra từng khu vực: `/hoc-sinh`, `/tram`, `/giao-vien`, `/quan-tri`.

## Quyền dữ liệu

RLS bật trên tất cả bảng. Trình duyệt không có quyền ghi trực tiếp ledger, đóng góp, quà hay profile. Giai đoạn 2 cho người trực/admin xác nhận đóng góp qua RPC nguyên tử, có kiểm tra quyền tại database. Người quản lý project thao tác thiết lập qua SQL Editor.

Học sinh xem dữ liệu mình; giáo viên xem hồ sơ/đóng góp trong lớp được phân công; người trực xem giao dịch trạm được phân công; admin xem dữ liệu quản trị. QR token không có quyền đọc trực tiếp. Việc khóa tài khoản dựa trên `profiles.active`, không chỉ trạng thái giao diện.

Mức điểm, giới hạn khối lượng và thời hạn QR chưa được seed vì chưa được chốt. Dữ liệu demo và seed 20 học sinh sẽ chuẩn bị ở giai đoạn chức năng, trong project phát triển riêng.

## Kiểm tra

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:ui
```

Kiểm thử SQL dùng PostgreSQL nhúng PGlite để chạy migration và request theo vai trò. Cần kiểm tra thêm đăng nhập thật và RLS trên project Supabase sau khi kết nối. Không thể xác nhận email/mật khẩu đúng/sai trước khi có project và tài khoản.

## Tài liệu tham chiếu

- Stitch giữ nguyên trong `stitch_green_station_ecorewards_pwa/`.
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation)

Giao diện giữ bố cục thẻ điểm, thẻ lớp, vật liệu, hoạt động và thanh điều hướng của Stitch; bỏ nội dung IoT/CO₂/cấp độ vượt MVP. Chưa có logo trường chính thức. Trạng thái không có dữ liệu hiển thị rõ thay cho số liệu mẫu.

## Kết quả kiểm tra tại máy — 08/10/2026

- Lint, TypeScript và production build: đạt.
- Migration chạy thành công trên PostgreSQL nhúng; kiểm tra quyền đọc theo vai trò, tài khoản vô hiệu hóa, chặn tự nâng quyền và chặn ghi/xóa ledger: đạt.
- Hai kiểm thử trình duyệt: trang công khai trên điện thoại không tràn ngang, điều hướng tới đăng nhập, trạng thái chưa cấu hình, chặn các khu vực riêng và khung desktop 448px: đạt.
- Font được đóng gói cục bộ, gồm bộ ký tự tiếng Việt.
- `npm audit --omit=dev`: không có cảnh báo. Audit toàn bộ có 5 cảnh báo mức cao trong chuỗi công cụ ESLint/fast-glob/micromatch/braces; hiện chưa có bản sửa tương thích được npm đề xuất. Không tự hạ phiên bản Next.js để xử lý cảnh báo công cụ phát triển.
- Chưa chạy migration trên Supabase thật; chưa kiểm tra mật khẩu đúng/sai hay phiên đăng nhập thật vì chưa có project.

Giai đoạn 1 chỉ hoàn tất sau khi kết nối và kiểm tra trên project phát triển. Chưa triển khai lên Vercel.
