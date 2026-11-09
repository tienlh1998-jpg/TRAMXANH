import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {randomUUID} from 'node:crypto';

test('Atomic contributions, expiring QR, duplicate requests, permissions and dashboard',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 for(const file of ['202610080001_foundation.sql','202610080002_contributions.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/seed/development_station.sql',import.meta.url),'utf8'));
 const student=randomUUID(),other=randomUUID(),operator=randomUUID(),teacher=randomUUID(),station='20000000-0000-4000-8000-000000000001',classId=randomUUID();
 await db.query("insert into public.classes(id,name,school_year) values($1,'10A1','2026')",[classId]);
 for(const [id,role,code]of[[student,'STUDENT','HS001'],[other,'STUDENT','HS002'],[operator,'STATION_OPERATOR',null],[teacher,'TEACHER',null]]){
 await db.query('insert into auth.users values($1)',[id]);await db.query('insert into public.profiles(id,full_name,role,student_code,active,class_id) values($1,$2,$3,$4,true,$5)',[id,role,role,code,classId]);}
 await db.query('insert into public.station_assignments values($1,$2)',[station,operator]);
 const material=(await db.query("select id from public.material_types where name='Chai nhựa PET'")).rows[0].id;
 async function as(id,sql,params=[]){await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);try{return await db.query(sql,params);}finally{await db.exec('reset role');}}
 const issue=async()=> (await as(student,'select public.issue_student_qr() result')).rows[0].result;
 const save=async(id,token,request=randomUUID(),kg=0.405,st=station)=> (await as(id,'select public.confirm_contribution($1,$2,$3,$4,$5) result',[request,st,token,material,kg])).rows[0].result;
 const qr=await issue();
 await as(operator,'select public.identify_student($1,$2)',[station,qr.token]);
 assert.equal((await db.query('select count(*) n from public.point_transactions')).rows[0].n,0,'identification does not award points');
 await assert.rejects(save(student,qr.token),/NOT_ALLOWED/);
 await assert.rejects(save(teacher,qr.token),/NOT_ALLOWED/);
 await assert.rejects(save(operator,qr.token,randomUUID(),0),/INVALID_INPUT/);
 await assert.rejects(save(operator,qr.token,randomUUID(),-1),/INVALID_INPUT/);
 await assert.rejects(save(operator,qr.token,randomUUID(),51),/WEIGHT_TOO_HIGH/);
 await assert.rejects(save(operator,qr.token,randomUUID(),0.0001),/INVALID_INPUT/);
 const request=randomUUID();const receipt=await save(operator,qr.token,request);
 assert.equal(receipt.points,40,'floor 0.405 * 100');
 const repeat=await save(operator,qr.token,request);assert.equal(repeat.id,receipt.id);assert.equal(repeat.duplicate,true);
 await assert.rejects(save(operator,qr.token),/QR_INVALID/);
 await assert.rejects(save(operator,qr.token,request,1),/REQUEST_CONFLICT/);
 assert.equal((await db.query('select count(*) n from public.point_transactions')).rows[0].n,1);
 const next=await issue();await db.exec("update public.qr_sessions set created_at=now()-interval '10 minutes',expires_at=now()-interval '1 minute'");
 await assert.rejects(save(operator,next.token),/QR_INVALID/);
 const old=await issue();await issue();await assert.rejects(save(operator,old.token),/QR_INVALID/);
 const manual=await save(operator,'hs001');assert.equal(manual.points,40);
 await assert.rejects(save(operator,'HS001',randomUUID(),1,randomUUID()),/NOT_ALLOWED/);
 const dash=(await as(student,'select public.student_dashboard() result')).rows[0].result;
 assert.equal(dash.balance,80);assert.equal(dash.count,2);assert.equal(dash.kilograms,0.81);assert.equal(dash.class_rank,1);
 assert.equal((await as(other,'select * from public.contributions')).rows.length,0,'no private history leak');
 assert.equal((await as(student,'select * from public.stations')).rows.length,1,'student can see own station name');
 await db.query('update public.profiles set active=false where id=$1',[operator]);await assert.rejects(save(operator,'HS001'),/NOT_ALLOWED/);
 // Database failure must roll back the contribution as well as ledger/QR.
 await db.query('update public.profiles set active=true where id=$1',[operator]);
 await db.exec("create function public.fail_ledger() returns trigger language plpgsql as $$begin raise exception 'SIMULATED_FAILURE';end$$;create trigger fail_ledger before insert on public.point_transactions for each row execute function public.fail_ledger();");
 const last=await issue();await assert.rejects(save(operator,last.token),/SIMULATED_FAILURE/);
 assert.equal((await db.query('select count(*) n from public.contributions')).rows[0].n,2);
 assert.equal((await db.query('select used_at from public.qr_sessions')).rows[0].used_at,null);
 }finally{await db.close();}
});
