# Hướng dẫn sử dụng EcoPoint

## Học sinh

Đăng nhập bằng tài khoản được người quản lý cấp. Trang chủ hiển thị số dư, kg và số lượt đã xác nhận. Tại Trạm Xanh, mở QR cá nhân và tạo mã mới hoặc đưa mã học sinh. Người trực cân và xác nhận; quét QR không tự cộng điểm. Xem lịch sử để đối chiếu vật liệu, kg, điểm, trạm và giờ.

Đổi quà: chọn quà đủ điểm và còn hàng, đọc xác nhận, bấm đổi. Phiếu Chờ nhận lưu tại Phiếu nhận quà. Đưa mã cho người phụ trách; chỉ khi giao quà xong phiếu mới chuyển Đã nhận. Muốn hủy phiếu chưa nhận, liên hệ người phụ trách. Không chia sẻ mật khẩu hoặc mã nhận quà.

## Người trực trạm

Đăng nhập tài khoản riêng. Chọn trạm được phân công, quét QR hoặc nhập mã, bấm Tìm học sinh và đối chiếu tên/lớp. Chọn đúng vật liệu, cân bằng cân thông thường, nhập kg (tối đa 3 số thập phân), kiểm tra dự kiến và xác nhận sau khi đã nhận rác. Mỗi lượt ghi một loại vật liệu. Ghi nhận biên nhận thành công; khi mạng gián đoạn, thử lại cùng yêu cầu hoặc kiểm tra lịch sử trước khi tạo lượt mới. Không tự nhận diện bằng QR trạm hoặc tự cộng điểm.

Camera cần quyền truy cập và HTTPS khi dùng trên Internet. Nếu camera không hoạt động, dùng mã học sinh. Không ghi tiếp nhận khi mất mạng.

## Giáo viên

Đăng nhập để xem báo cáo các lớp được phân công. Chọn khoảng ngày để xem kg, lượt, điểm và tổng hợp lớp/vật liệu/trạm/ngày/tháng. Không có chức năng ghi hoặc sửa điểm. Nếu thiếu lớp, liên hệ admin kiểm tra phân công.

## Quản trị viên

Tạo tài khoản Auth trong Supabase Dashboard với mật khẩu riêng, rồi dùng User UID thêm hồ sơ tại Tài khoản & học sinh. Chọn vai trò, lớp, mã học sinh và kích hoạt. Tạo lớp, trạm, vật liệu, quà; phân công người trực và giáo viên. Thay đổi điểm/kg chỉ áp dụng các lượt sau. Tồn kho quà điều chỉnh bằng số tăng/giảm.

Giao quà: đối chiếu phiếu và học sinh, giao xong mới xác nhận. Hủy phiếu đang chờ phải có lý do; hệ thống hoàn điểm/tồn kho một lần. Phiếu đã nhận không hủy tự động.

Đóng góp sai: kiểm tra biên nhận, mở Xử lý giao dịch sai, nhập lý do và xác nhận. Hệ thống ghi giao dịch đảo và giữ lịch sử gốc. Nếu điểm đã dùng, hoàn phiếu đang chờ để đủ điểm trước khi đảo. Không sửa/xóa trực tiếp ledger. Xem Nhật ký để đối chiếu ai thay đổi và trước/sau.

## Đăng nhập và sự cố

- Các tab cùng trình duyệt dùng chung tài khoản. Thử admin và học sinh đồng thời bằng hai trình duyệt hoặc cửa sổ ẩn danh.
- Không đủ điểm/hết hàng: chọn quà khác hoặc tích thêm điểm.
- QR hết hạn/đã dùng: tạo QR mới.
- Không thấy trạm/lớp: kiểm tra vai trò, kích hoạt và phân công.
- Tải hồ sơ lỗi: dùng Thử lại; không tạo giao dịch mới khi chưa biết kết quả giao dịch trước.
- Quên mật khẩu: liên hệ người quản lý để xử lý qua Supabase Authentication. Website chưa có luồng tự đặt lại mật khẩu.

## Vận hành tại trường

Nhóm 5 học sinh cần phân công rõ người trực, đối chiếu số liệu, quản lý vật liệu và giao quà; người lớn giữ quyền quản lý hệ thống. Trước mỗi buổi kiểm tra cân, mạng, tồn kho, vật liệu được nhận và nơi chứa rác. Cuối buổi đối chiếu kg theo vật liệu với báo cáo. Khi bàn giao cho đơn vị thu mua/tái chế, lưu chứng từ ngoài website; MVP chưa quản lý vận chuyển hoặc tiền bán rác.

Quà do nguồn kinh phí được trường/nhóm xác nhận; website không thu tiền hoặc thanh toán. Kết quả chứng minh bằng đóng góp hợp lệ, báo cáo, lịch sử điểm, phiếu đã nhận và chứng từ bàn giao; không suy diễn CO₂ hoặc cây xanh.
