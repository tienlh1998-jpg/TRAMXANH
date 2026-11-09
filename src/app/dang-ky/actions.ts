'use server';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {supabaseConfig} from '@/lib/supabase/config';
import {provisionStudent} from '@/lib/student-registration';
export async function register(_previous:{error:string;success:string},form:FormData){
 if(!supabaseConfig()||!process.env.SUPABASE_SERVICE_ROLE_KEY)return {error:'Chức năng đăng ký chưa sẵn sàng.',success:''};
 const email=String(form.get('email')??'').trim();const full_name=String(form.get('full_name')??'').trim();const password=String(form.get('password')??'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!full_name||full_name.length>120||password.length<8||password.length>128||password!==form.get('confirm_password'))return {error:'Nhập họ tên, email hợp lệ và hai mật khẩu giống nhau (ít nhất 8 ký tự).',success:''};
 const client=await createClient();const {data,error}=await client.auth.signUp({email,password,options:{data:{full_name,ecopoint_signup:true},emailRedirectTo:'https://ecopoint-pi.vercel.app/auth/callback'}});
 if(error){console.warn('EcoPoint signup failure',{code:error.code,status:error.status});const messages:Record<string,string>={over_email_send_rate_limit:'Hệ thống đang chạm giới hạn gửi email xác nhận. Hãy kiểm tra hộp thư nếu bạn đã đăng ký trước đó; nếu chưa có thư, thử lại sau khi hạn mức gửi được khôi phục.',over_request_rate_limit:'Có quá nhiều yêu cầu đăng ký trong thời gian ngắn. Chờ một lúc rồi thử lại.',email_address_not_authorized:'Hệ thống chưa gửi được thư xác nhận đến email này. Vui lòng liên hệ người phụ trách EcoPoint.',signup_disabled:'Hệ thống đang tạm dừng đăng ký mới.',weak_password:'Mật khẩu chưa đáp ứng yêu cầu. Hãy dùng mật khẩu mạnh hơn.'};return {error:messages[error.code??'']??(error.status===429?'Hệ thống đang giới hạn đăng ký hoặc gửi email xác nhận. Hãy kiểm tra thư đã nhận và thử lại sau.':'Chưa thể đăng ký. Kiểm tra email, mật khẩu hoặc thử lại sau.'),success:''};}
 if(data.session){const issue=await provisionStudent(client);if(issue)return {error:issue,success:''};redirect('/hoc-sinh');}
 return {error:'',success:'Kiểm tra hộp thư và thư rác để xác nhận email. Mở liên kết trên cùng trình duyệt vừa đăng ký. Nếu email đã có tài khoản, hãy đăng nhập hoặc dùng Quên mật khẩu.'};
}
