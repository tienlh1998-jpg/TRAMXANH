'use client';
import {useActionState} from 'react';
import {adminMutation} from '@/app/admin-actions';
export function AdminForm({children,request}:{children:React.ReactNode;request?:string}){
 const [state,action,pending]=useActionState(adminMutation,{error:'',success:''});
 return <form action={action} className="admin-form"><fieldset disabled={pending}>{request&&<input type="hidden" name="request" value={request}/>} {children}<label>Lý do thay đổi<input name="reason" required minLength={3} maxLength={500} placeholder="Ví dụ: Cập nhật theo danh sách lớp"/></label>{state.error&&<p role="alert" className="message error">{state.error}</p>}{state.success&&<p role="status" className="message success">{state.success}</p>}<button className="button" disabled={pending||Boolean(state.success)}>{pending?'Đang lưu…':state.success?'Đã lưu':'Xác nhận lưu'}</button>{state.success&&<button type="button" className="button" onClick={()=>window.location.reload()}>Tải lại để tiếp tục quản lý</button>}</fieldset></form>;
}
