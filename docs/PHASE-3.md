# Giai đoạn 3 — Quà, xếp hạng và thành quả

## Kích hoạt trên Supabase phát triển

1. Chạy toàn bộ `supabase/migrations/202610080003_rewards_and_impact.sql` trong SQL Editor, một lần, sau migrations 001 và 002. Không chạy lại migrations cũ. Migration giữ nguyên lịch sử, bổ sung tên quà tại thời điểm đổi và bốn RPC.
2. Chỉ trong project phát triển, chạy `supabase/seed/development_rewards.sql` để có 5 quà mẫu. Giá và tồn kho này chỉ để thử; không phải quà cam kết cho pilot. Script không ghi đè tồn kho hoặc quà đã có. Ảnh quà mẫu là minh họa, không phải ảnh sản phẩm thực tế.
3. Tải lại EcoPoint. Học sinh vào `/hoc-sinh/qua`; admin vào `/quan-tri/phieu-qua`.

## Kiểm tra thực tế

- Học sinh đã có 40 điểm từ giai đoạn 2: đổi Bút viết xanh (40 điểm), xác nhận, số dư về 0 và có phiếu Chờ nhận; tồn kho giảm 1.
- Bấm lại hoặc gửi lại cùng yêu cầu: chỉ một phiếu, một lần trừ điểm.
- Thiếu điểm hoặc quà hết hàng: không đổi được. Database kiểm tra lại dù giao diện đã hiển thị số dư/tồn kho.
- Admin đối chiếu học sinh và mã phiếu rồi xác nhận Đã giao quà. Phiếu chuyển Đã nhận. Không thể hủy phiếu đã giao.
- Hoặc admin hủy phiếu Chờ nhận, nhập lý do: hoàn điểm và trả quà vào tồn kho đúng một lần. Có nhật ký xử lý.
- Phiếu của học sinh khác bị RLS chặn. Phiếu đã hủy vẫn giữ trong lịch sử.
- Xếp hạng lớp theo Tuần này / Tháng này / Tổng cộng, tính điểm đóng góp hợp lệ, không trừ điểm lớp khi đổi quà. Tuần bắt đầu thứ Hai theo múi giờ Việt Nam; lớp bằng điểm cùng hạng.
- Thành quả xanh: học sinh đã có đóng góp hợp lệ, kg, lượt, quà đã nhận, 8 tuần thu gom và phân loại vật liệu. Phiếu Chờ nhận không tính là quà đã nhận. Đóng góp bị đảo không tính vào thành quả.

## Các trang

- Học sinh: `/hoc-sinh/qua`, `/hoc-sinh/phieu-qua`, `/hoc-sinh/xep-hang`, `/hoc-sinh/thanh-qua`.
- Admin: `/quan-tri/phieu-qua`, có lọc Chờ nhận / Đã nhận / Đã hủy và phân trang.
- Trang giới thiệu công khai: số liệu tổng hợp thật, không công khai danh tính, email hoặc mã học sinh.
- Quản lý danh mục quà, báo cáo giáo viên và xử lý đóng góp sai vẫn thuộc giai đoạn 4.

## An toàn giao dịch

`redeem_reward` khóa mã yêu cầu, tài khoản học sinh và quà. Kiểm tra số dư từ ledger, trừ điểm, giảm tồn kho và tạo phiếu trong một transaction. Mã yêu cầu UUID giúp retry an toàn; cùng mã khác quà/học sinh bị từ chối. `process_redemption` chỉ cho admin hoạt động, khóa tài khoản và phiếu, kiểm tra trạng thái cuối, ghi hoàn điểm/tồn kho/nhật ký cùng transaction. Mỗi lần trừ hoặc hoàn có unique constraint tại ledger. Không có quyền ghi trực tiếp từ trình duyệt.

Kiểm thử PostgreSQL nhúng kiểm tra thiếu điểm, hết hàng, retry, riêng tư, sai vai trò, tài khoản khóa, hoàn đúng một lần, trạng thái cuối, rollback khi ledger lỗi, lớp bằng điểm, ranh giới tháng theo giờ Việt Nam và thống kê công khai không có dữ liệu cá nhân. Đăng nhập thật và luồng giao quà cần kiểm tra trên Supabase sau khi cài SQL.
