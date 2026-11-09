# Luồng QR trạm — 09/10/2026

Chạy **một lần** migration `supabase/migrations/202610090005_station_requests.sql` trên Supabase đã cài 001–004. Không chạy lại SQL cũ, không xóa giao dịch. Sau khi cài, giao diện mới sẽ hoạt động.

1. Admin vào **QR in tại trạm**, chọn trạm đang hoạt động, tạo QR, lưu PNG hoặc in. Mã chứa định danh trạm; không chứa thông tin học sinh và không cộng điểm.
2. Học sinh vào **Quét trạm**, quét mã (hoặc dán nội dung mã), mở trạm, chọn vật liệu, nhập kg và gửi. Xem **Yêu cầu của tôi** để theo dõi Chờ duyệt / Đã duyệt / Đã từ chối.
3. Người giám sát đăng nhập ADMIN hoặc STATION_OPERATOR được phân công, vào `/tram`, kiểm tra học sinh, vật liệu và rác thực tế. Bấm Kiểm tra & duyệt, nhập kg thực cân rồi xác nhận. Có thể từ chối kèm lý do để học sinh gửi lại.
4. Chỉ sau duyệt, hệ thống ghi đóng góp, ledger, trạng thái yêu cầu và nhật ký trong một transaction. Điểm tính theo mức database tại thời điểm duyệt. Duyệt lặp lại không cộng thêm. Yêu cầu chờ/từ chối không tính vào bảng xếp hạng hoặc thành quả.

QR trạm cố định có thể bị chụp lại; người giám sát phải đối chiếu học sinh và rác có mặt tại trạm trước khi duyệt. Ngừng trạm chặn gửi mới và duyệt mới; vẫn giữ lịch sử. Không có bước tự nhận điểm từ QR. Phân công người giám sát dùng mục Phân công hiện có.

Luồng QR cá nhân/nhập liệu trực tiếp cũ không còn hiển thị trong giao diện chính. Những hàm cũ được giữ để bảo toàn tương thích và lịch sử; vẫn kiểm tra vai trò cũ, học sinh không có quyền tự cộng điểm qua các hàm này.

Kiểm thử: gửi yêu cầu không có ledger; sai vai trò/trạm bị chặn; người khác không xem yêu cầu riêng; duyệt một lần; kg được giám sát chỉnh đúng; từ chối không cộng điểm; lỗi ledger hoàn tác và giữ Chờ duyệt; trạm ngừng không nhận yêu cầu mới.
