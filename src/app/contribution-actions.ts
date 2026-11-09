'use server';
import { requireProfile } from '@/lib/auth';
import QRCode from 'qrcode';
import { revalidatePath } from 'next/cache';

function message(error: { message: string }) {
 const codes: Record<string,string> = { QR_INVALID: 'QR đã hết hạn hoặc đã dùng. Hãy tạo QR mới.', STUDENT_NOT_FOUND: 'Không tìm thấy học sinh đang hoạt động.', NOT_ALLOWED: 'Bạn chưa được phân công tại trạm này.', NOT_CONFIGURED: 'Trạm chưa cấu hình quy đổi. Liên hệ người quản lý.', WEIGHT_TOO_HIGH: 'Khối lượng vượt giới hạn của trạm.', POINTS_INVALID: 'Khối lượng quá nhỏ để nhận một điểm.', INVALID_INPUT: 'Kiểm tra lại mã học sinh và khối lượng.', MATERIAL_INVALID: 'Vật liệu này không còn được tiếp nhận.', REQUEST_CONFLICT: 'Yêu cầu đã ghi nhận với nội dung khác.' };
 return codes[error.message] ?? 'Chưa thể xử lý. Kiểm tra kết nối hoặc cấu hình database rồi thử lại.';
}
export async function issueQr() {
 const { client } = await requireProfile(['STUDENT']);
 const { data, error } = await client.rpc('issue_student_qr');
 if (error) return { error: message(error) };
 return { token: data.token as string, expiresAt: data.expires_at as string, image: await QRCode.toDataURL(data.token, { width: 280, margin: 2 }), error: '' };
}
export async function identifyStudent(station: string, identifier: string) {
 const { client } = await requireProfile(['STATION_OPERATOR','ADMIN']);
 const { data, error } = await client.rpc('identify_student', { p_station: station, p_identifier: identifier.trim() });
 return error ? { error: message(error), student: null } : { error: '', student: data as { id: string; name: string; class_name: string | null; code: string } };
}
export async function confirmContribution(input: { request: string; station: string; identifier: string; material: string; weight: string }) {
 const { client } = await requireProfile(['STATION_OPERATOR','ADMIN']);
 if (!/^\d+(?:\.\d{1,3})?$/.test(input.weight) || !Number.isFinite(Number(input.weight))) return { error: 'Nhập số kg hợp lệ, tối đa 3 chữ số sau dấu phẩy.', receipt: null };
 const { data, error } = await client.rpc('confirm_contribution', { p_request: input.request, p_station: input.station, p_identifier: input.identifier.trim(), p_material: input.material, p_weight: Number(input.weight) });
 if (error) return { error: message(error), receipt: null };
 revalidatePath('/hoc-sinh'); revalidatePath('/tram');
 return { error: '', receipt: data as { id: string; points: number; weight: number } };
}
