import 'server-only';
import {createClient as adminClient,type SupabaseClient} from '@supabase/supabase-js';
export async function provisionStudent(client:SupabaseClient){
 const {data:{user},error}=await client.auth.getUser();if(error||!user)return 'Phiên đăng nhập không hợp lệ.';
 const existing=await client.from('profiles').select('id').eq('id',user.id).maybeSingle();if(existing.error)return 'Chưa thể kiểm tra hồ sơ.';if(existing.data)return '';
 // Only explicitly self-registered students get a new profile. Never overwrite roles or inactive profiles.
 if(user.user_metadata?.ecopoint_signup!==true)return '';
 const name=String(user.user_metadata?.full_name??'').trim();if(!name||name.length>120)return 'Họ tên đăng ký không hợp lệ.';
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;const url=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!key||!url)return 'Chưa thể kích hoạt tài khoản. Liên hệ người phụ trách.';
 const service=adminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const result=await service.from('profiles').upsert({id:user.id,full_name:name,email:user.email,role:'STUDENT',active:true,student_code:'HS-'+user.id.replaceAll('-','')},{onConflict:'id',ignoreDuplicates:true});
 return result.error?'Chưa thể tạo hồ sơ học sinh. Bạn có thể đăng nhập lại để thử tiếp.':'';
}
