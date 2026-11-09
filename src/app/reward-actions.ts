'use server';
import { requireProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
function friendly(message: string) {
 const errors: Record<string,string>={INSUFFICIENT_POINTS:'Bạn chưa đủ điểm để đổi quà này.',OUT_OF_STOCK:'Quà vừa hết hàng. Hãy chọn quà khác.',REWARD_INVALID:'Quà này tạm ngừng đổi.',NOT_ALLOWED:'Bạn chưa được cấp quyền thực hiện.',REQUEST_CONFLICT:'Yêu cầu đã được dùng cho quà khác.',REDEMPTION_FINAL:'Phiếu đã xử lý, không thể thay đổi.',REASON_REQUIRED:'Nhập lý do hủy từ 3 đến 500 ký tự.',REDEMPTION_NOT_FOUND:'Không tìm thấy phiếu nhận quà.'};
 return errors[message]??'Chưa thể xử lý. Kiểm tra kết nối và thử lại cùng yêu cầu.';
}
export async function redeemReward(request: string,reward: string) {
 const {client}=await requireProfile(['STUDENT']);
 const {data,error}=await client.rpc('redeem_reward',{p_request:request,p_reward:reward});
 if(error)return {error:friendly(error.message),receipt:null};
 revalidatePath('/hoc-sinh');revalidatePath('/quan-tri');
 return {error:'',receipt:data as {id:string;code:string;points:number;status:string}};
}
export async function processRedemption(id:string,action:'COLLECTED'|'CANCELLED',reason:string) {
 const {client}=await requireProfile(['ADMIN']);
 const {error}=await client.rpc('process_redemption',{p_id:id,p_action:action,p_reason:reason});
 if(error)return {error:friendly(error.message)};
 revalidatePath('/quan-tri');revalidatePath('/hoc-sinh');
 return {error:''};
}
