# Giai đoạn 2 — Đổi rác lấy điểm

## Cài đặt Supabase

Project hiện có chỉ cài migration giai đoạn 1. Mở SQL Editor, chạy **một lần** toàn bộ `supabase/migrations/202610080002_contributions.sql`. Không chạy lại migration 001. Migration mới thêm hash nhận diện và bốn hàm RPC; không xóa đóng góp, không thay đổi mức điểm đang có.

Đối với project **phát triển**, chạy `supabase/seed/development_station.sql` để có 1 trạm, 3 vật liệu thử nghiệm và cấu hình: PET 100, giấy 30, lon 200 điểm/kg; tối đa 50 kg, QR 120 giây, làm tròn xuống. Các mức này chỉ để kiểm thử; phải chốt mức chính thức trước pilot. Seed không ghi đè danh mục đã có.

## Tạo tài khoản kiểm thử

Admin đang có tài khoản có thể vào `/tram` để thử luồng. Để thử QR cần tạo một tài khoản học sinh riêng trong Authentication → Users → Add user, đặt mật khẩu riêng và xác nhận email. Sau đó lấy UID và chạy SQL sau, thay UID bằng giá trị thật:

```sql
insert into public.classes(name,school_year)
values('Lớp thử nghiệm','2026-2027') on conflict(name,school_year) do nothing;

insert into public.profiles(id,full_name,role,student_code,class_id,active)
select 'THAY_UID_HOC_SINH'::uuid,'Học sinh thử nghiệm','STUDENT','HS001',id,true
from public.classes where name='Lớp thử nghiệm' and school_year='2026-2027';
```

Người trực riêng cần profile STATION_OPERATOR và bản ghi phân công (thay UID):

```sql
insert into public.station_assignments(station_id,operator_id)
values('20000000-0000-4000-8000-000000000001','THAY_UID_NGUOI_TRUC'::uuid);
```

Không dùng dữ liệu thật của học sinh trong môi trường thử. Tạo user bằng dashboard, không chèn trực tiếp `auth.users`, không sử dụng mật khẩu chung. Bộ 20 học sinh demo chưa được tạo trên cloud để tránh tự cấp tài khoản khi chưa có thông tin đăng nhập quản trị API.

## Thử một đóng góp

1. Đăng nhập học sinh ở trình duyệt/thiết bị riêng, mở QR cá nhân, bấm tạo mã.
2. Đăng nhập admin hoặc người trực ở thiết bị trạm, mở `/tram`.
3. Quét QR hoặc nhập `HS001`, bấm tìm học sinh. Đối chiếu tên/lớp.
4. Chọn PET, nhập `0,405` kg. Điểm dự kiến là 40.
5. Bấm kiểm tra, đọc nội dung xác nhận, rồi xác nhận sau khi nhận rác.
6. Học sinh tải lại trang chủ: số dư tăng 40, kg tăng 0,405, lượt tăng 1. Xem lịch sử để đối chiếu.

Camera cần được cấp quyền. HTTPS cần thiết khi triển khai lên Internet; localhost dùng được trên máy trạm. Nếu camera không mở được, nhập mã học sinh. Một lượt chỉ ghi một loại vật liệu. QR mới thay mã cũ và chỉ dùng cho một đóng góp; tạo lại mã khi chuyển sang lượt cân khác.

## Cơ chế chống sai/trùng

- Quét/tìm học sinh không ghi điểm.
- Database kiểm tra tài khoản hoạt động, trạm được phân công, vật liệu, kg và QR.
- Mỗi yêu cầu có UUID; gửi lại cùng nội dung trả về biên nhận cũ. Cùng UUID khác nội dung bị từ chối.
- Database khóa yêu cầu, tài khoản học sinh và QR, ghi đóng góp + ledger + đánh dấu QR trong cùng transaction; nếu một bước lỗi thì tất cả được hoàn tác.
- Không chấp nhận 0, số âm, quá giới hạn, quá 3 số thập phân, hoặc khối lượng không đủ nhận 1 điểm.
- Điểm chính thức dùng mức quy đổi hiện tại trong database và lưu lại mức này trong đóng góp.
- Xếp hạng trên trang chủ là tổng điểm đóng góp hợp lệ của lớp; bảng tuần/tháng riêng thuộc giai đoạn 3.

## Kiểm chứng

`npm test` chạy migration trên PostgreSQL nhúng, kiểm tra QR hết hạn/dùng lại, tái tạo QR, chống trùng, sai quyền/trạm, tài khoản bị khóa, làm tròn điểm, riêng tư lịch sử và rollback khi ghi ledger lỗi. `npm run test:ui` kiểm tra trang công khai và chặn khu vực riêng với phiên chưa đăng nhập. Đăng nhập và camera thật cần kiểm tra sau khi cài migration trên Supabase.
