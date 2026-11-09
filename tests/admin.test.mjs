import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

test('Administration permission, audited edits, inventory retries, scoped reports and safe reversal',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 for(const file of ['202610080001_foundation.sql','202610080002_contributions.sql','202610080003_rewards_and_impact.sql','202610080004_administration.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 for(const file of ['development_station.sql','development_rewards.sql'])await db.exec(await readFile(new URL('../supabase/seed/'+file,import.meta.url),'utf8'));
 const student=randomUUID(),second=randomUUID(),admin=randomUUID(),teacher=randomUUID(),operator=randomUUID(),c1=randomUUID(),c2=randomUUID();
 await db.query("insert into public.classes(id,name,school_year) values($1,'10A1','2026'),($2,'10A2','2026')",[c1,c2]);
 for(const [id,role,code,cls]of[[student,'STUDENT','HS001',c1],[second,'STUDENT','HS002',c2],[admin,'ADMIN',null,null],[teacher,'TEACHER',null,c1],[operator,'STATION_OPERATOR',null,null]]){
 await db.query('insert into auth.users values($1)',[id]);await db.query('insert into public.profiles(id,full_name,role,student_code,class_id,active) values($1,$2,$3,$4,$5,true)',[id,role,role,code,cls]);}
 async function as(id,sql,args=[]){await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);try{return await db.query(sql,args);}finally{await db.exec('reset role');}}
 const save=async(entity,id,data,request=randomUUID(),actor=admin)=> (await as(actor,'select public.admin_save($1,$2,$3,$4,$5) result',[entity,id,data,'Thay đổi thử nghiệm',request])).rows[0].result;
 await assert.rejects(save('classes',null,{name:'X',school_year:'2026',active:true},randomUUID(),student),/NOT_ALLOWED/);
 const created=await save('classes',null,{name:'10A3',school_year:'2026',active:true});
 await save('classes',created,{name:'10A3 mới',school_year:'2026',active:false});
 await assert.rejects(save('profiles',admin,{full_name:'Admin',role:'STUDENT',active:true,class_id:c1,student_code:'ME'}),/SELF_LOCKOUT/);
 await assert.rejects(save('profiles',randomUUID(),{full_name:'New',role:'STUDENT',active:true,class_id:c1,student_code:'HS003'}),/AUTH_USER_REQUIRED/);
 await assert.rejects(save('profiles',student,{full_name:'Student',role:'STUDENT',active:true,class_id:c1,student_code:''}),/STUDENT_FIELDS_REQUIRED/);
 await save('profiles',student,{full_name:'Tên đã sửa',role:'STUDENT',active:true,class_id:c1,student_code:'hs001'});
 const gift='30000000-0000-4000-8000-000000000001';const request=randomUUID();const giftData={name:'Bút mới',description:'Mẫu',image_url:'/rewards/gift.svg',points_cost:40,stock_delta:2,active:true};
 await save('rewards',gift,giftData,request);await save('rewards',gift,giftData,request);
 assert.equal((await db.query('select stock from public.rewards where id=$1',[gift])).rows[0].stock,22,'retry only adds stock once');
 await assert.rejects(save('rewards',gift,{...giftData,stock_delta:3},request),/REQUEST_CONFLICT/);
 await assert.rejects(save('rewards',gift,{...giftData,stock_delta:-100}),/check constraint/);
 await as(admin,"select public.admin_assign('CLASS',$1,$2,true,'Phân công thử')",[teacher,c1]);
 const station='20000000-0000-4000-8000-000000000001';
 await as(admin,"select public.admin_assign('STATION',$1,$2,true,'Phân công thử')",[operator,station]);
 await assert.rejects(as(admin,"select public.admin_assign('STATION',$1,$2,true,'Phân công thử')",[teacher,station]),/ROLE_MISMATCH/);
 await assert.rejects(as(teacher,"select public.admin_settings(50,120,'Test')"),/NOT_ALLOWED/);
 await as(admin,"select public.admin_settings(60,150,'Cập nhật cấu hình')");
 const material=(await db.query("select id from public.material_types where name='Chai nhựa PET'")).rows[0].id;
 const give=async(code)=> (await as(operator,'select public.confirm_contribution($1,$2,$3,$4,1) result',[randomUUID(),station,code,material])).rows[0].result;
 const first=await give('HS001');await give('HS002');
 const report=async(actor,cls=null)=>(await as(actor,'select public.program_report(null,null,$1) result',[cls])).rows[0].result;
 assert.equal((await report(admin)).kg,2);assert.equal((await report(teacher)).kg,1);assert.equal((await report(teacher)).students,1);assert.equal((await report(teacher)).points_redeemed,null);
 assert.equal((await report(teacher,c2)).kg,0,'teacher cannot select another class');
 assert.equal((await report(admin,c1)).kg,1,'class filter affects all report groups');
 await assert.rejects(report(student),/NOT_ALLOWED/);
 const redemption=(await as(student,'select public.redeem_reward($1,$2) result',[randomUUID(),gift])).rows[0].result;
 await assert.rejects(as(admin,"select public.reverse_contribution($1,'Sai khối lượng')",[first.id]),/REVERSAL_INSUFFICIENT_BALANCE/);
 assert.equal((await db.query('select reversed_at from public.contributions where id=$1',[first.id])).rows[0].reversed_at,null,'failed reversal preserves contribution');
 await as(admin,"select public.process_redemption($1,'CANCELLED','Hoàn để sửa đóng góp')",[redemption.id]);
 await assert.rejects(as(teacher,"select public.reverse_contribution($1,'Sai khối lượng')",[first.id]),/NOT_ALLOWED/);
 await as(admin,"select public.reverse_contribution($1,'Sai khối lượng')",[first.id]);await as(admin,"select public.reverse_contribution($1,'Sai khối lượng')",[first.id]);
 assert.equal((await db.query("select count(*) n from public.point_transactions where kind='REVERSAL'")).rows[0].n,1);
 assert.equal((await report(teacher)).kg,0);assert.equal((await report(admin)).kg,1);
 assert.equal((await as(student,'select public.student_dashboard() result')).rows[0].result.balance,0);
 await as(admin,"select public.admin_assign('CLASS',$1,$2,false,'Thu hồi phân công')",[teacher,c1]);assert.equal((await report(teacher)).kg,0);
 const audits=await db.query("select * from public.admin_audit_logs where action='UPDATE' and target_table='classes'");assert.equal(audits.rows[0].before_data.name,'10A3');assert.equal(audits.rows[0].after_data.name,'10A3 mới');
 await assert.rejects(as(student,'select * from private.admin_requests'),/permission denied/);
 await assert.rejects(as(student,"update public.rewards set stock=999"),/permission denied/);
 }finally{await db.close();}
});
