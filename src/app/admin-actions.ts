'use server';
import {requireProfile} from '@/lib/auth';
import {revalidatePath} from 'next/cache';
import {createClient as createSupabaseClient} from '@supabase/supabase-js';
export type AdminResult={error:string;success:string};
function friendly(error:{message:string;code?:string}){
 const messages:Record<string,string>={NOT_ALLOWED:'Bạn chưa được cấp quyền quản trị.',SELF_LOCKOUT:'Không thể tự khóa hoặc đổi vai trò admin của mình.',AUTH_USER_REQUIRED:'UID chưa có trong Supabase Authentication. Tạo tài khoản Auth trước.',UNIT_PENDING:'Vật liệu đang có yêu cầu chờ duyệt. Xử lý hết yêu cầu trước khi đổi đơn vị.',STUDENT_FIELDS_REQUIRED:'Học sinh cần mã học sinh.',ROLE_MISMATCH:'Vai trò không phù hợp với phân công.',REVERSAL_INSUFFICIENT_BALANCE:'Điểm đã được sử dụng. Hãy hủy phiếu quà đang chờ để hoàn đủ điểm trước khi đảo đóng góp.',CONTRIBUTION_NOT_FOUND:'Không tìm thấy đóng góp.',REASON_REQUIRED:'Nhập lý do từ 3 đến 500 ký tự.',INVALID_INPUT:'Kiểm tra lại dữ liệu nhập.',REQUEST_CONFLICT:'Yêu cầu đã có nội dung khác. Tải lại trang để tạo yêu cầu mới.'};
 return messages[error.message]??(error.code==='23505'?'Mã hoặc tên này đã tồn tại.':error.code==='23503'?'Tài khoản hoặc danh mục liên quan chưa tồn tại.':error.code==='23514'?'Giá trị vượt giới hạn hoặc tồn kho sẽ âm.':'Chưa thể lưu. Kiểm tra dữ liệu và kết nối rồi thử lại.');
}
export async function adminMutation(_previous:AdminResult,form:FormData):Promise<AdminResult>{
 const {client}=await requireProfile(['ADMIN']);const operation=String(form.get('operation')??'');const reason=String(form.get('reason')??'');
 let result;
 if(operation==='save'){
  const entity=String(form.get('entity')??'');const fields:Record<string,string[]>={profiles:['full_name','role','class_id','student_code'],classes:['name','school_year'],stations:['name','location'],material_types:['name','points_per_kg','unit','max_quantity'],rewards:['name','description','image_url','points_cost','stock_delta']};
  if(!fields[entity])return {error:'Danh mục không hợp lệ.',success:''};
  const data:Record<string,string|boolean>={active:form.get('active')==='on'};for(const key of fields[entity])data[key]=String(form.get(key)??'');
  let id=String(form.get('id')??'')||null;
  let newlyCreated:string|null=null;
  let authAdmin:ReturnType<typeof createSupabaseClient>|null=null;
  if(entity==='profiles'&&!id){
   const email=String(form.get('email')??'').trim().toLowerCase();const password=String(form.get('password')??'');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||String(data.full_name).trim().length<1||reason.trim().length<3||!['STUDENT','ADMIN','TEACHER','STATION_OPERATOR'].includes(String(data.role))||(data.role==='STUDENT'&&!String(data.student_code).trim()))return {error:'Nhập email, họ tên, mã học sinh (nếu là học sinh) và lý do hợp lệ.',success:''};
   const existing=await client.rpc('admin_auth_user',{p_email:email});
   if(existing.error)return {error:'Chưa thể tra cứu email. Cần chạy migration 006.',success:''};
   id=existing.data as string|null;
   if(!id){
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    if(!key||!url)return {error:'Để tạo email mới ngay tại đây, cấu hình SUPABASE_SERVICE_ROLE_KEY trên máy chủ. Email đã có trong Authentication có thể dùng ngay.',success:''};
    if(password.length<8||password.length>128)return {error:'Mật khẩu ban đầu cần từ 8 đến 128 ký tự.',success:''};
    authAdmin=createSupabaseClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const created=await authAdmin.auth.admin.createUser({email,password,email_confirm:true});
    if(created.error||!created.data.user)return {error:'Không tạo được tài khoản email. Kiểm tra email và chính sách mật khẩu trong Supabase.',success:''};
    id=created.data.user.id;newlyCreated=id;
   }
  }
  result=await client.rpc('admin_save',{p_entity:entity,p_id:id,p_data:data,p_reason:reason,p_request:String(form.get('request')??'')});
  if(result.error&&newlyCreated)return {error:'Email đã tạo nhưng chưa xác nhận được việc lưu hồ sơ. Thử lưu lại bằng cùng email; không tạo tài khoản trùng.',success:''};
 }else if(operation==='assign')result=await client.rpc('admin_assign',{p_scope:String(form.get('scope')),p_member:String(form.get('member')),p_target:String(form.get('target')),p_assigned:form.get('assigned')==='on',p_reason:reason});
 else if(operation==='settings')result=await client.rpc('admin_settings',{p_max:Number(form.get('max_weight')),p_ttl:Number(form.get('ttl')),p_reason:reason});
 else if(operation==='reverse')result=await client.rpc('reverse_contribution',{p_id:String(form.get('id')),p_reason:reason});
 else return {error:'Thao tác không hợp lệ.',success:''};
 if(result.error)return {error:friendly(result.error),success:''};
 revalidatePath('/quan-tri','layout');revalidatePath('/hoc-sinh','layout');revalidatePath('/giao-vien','layout');revalidatePath('/tram');
 return {error:'',success:'Đã lưu và ghi nhật ký thành công.'};
}

