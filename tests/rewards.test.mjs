import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

test('Reward atomicity, insufficient balance, stock, idempotent refund, privacy, ranking and impact',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 for(const file of ['202610080001_foundation.sql','202610080002_contributions.sql','202610080003_rewards_and_impact.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 for(const file of ['development_station.sql','development_rewards.sql'])await db.exec(await readFile(new URL('../supabase/seed/'+file,import.meta.url),'utf8'));
 const student=randomUUID(),second=randomUUID(),admin=randomUUID(),teacher=randomUUID(),c1=randomUUID(),c2=randomUUID();
 await db.query("insert into public.classes(id,name,school_year) values($1,'10A1','2026'),($2,'10A2','2026')",[c1,c2]);
 for(const [id,role,code,cls]of[[student,'STUDENT','HS001',c1],[second,'STUDENT','HS002',c2],[admin,'ADMIN',null,null],[teacher,'TEACHER',null,c1]]){
 await db.query('insert into auth.users values($1)',[id]);await db.query('insert into public.profiles(id,full_name,role,student_code,class_id,active) values($1,$2,$3,$4,$5,true)',[id,role,role,code,cls]);}
 async function as(id,sql,args=[]){await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);try{return await db.query(sql,args);}finally{await db.exec('reset role');}}
 const gift='30000000-0000-4000-8000-000000000001',expensive='30000000-0000-4000-8000-000000000005';
 const material=(await db.query("select id from public.material_types where name='Chai nhựa PET'")).rows[0].id;
 const station='20000000-0000-4000-8000-000000000001';
 const give=async(code)=>await as(admin,'select public.confirm_contribution($1,$2,$3,$4,1)',[randomUUID(),station,code,material]);
 const redeem=async(id,g=gift,r=randomUUID())=>(await as(id,'select public.redeem_reward($1,$2) result',[r,g])).rows[0].result;
 const process=async(id,action,reason='Hủy thử nghiệm')=>(await as(admin,'select public.process_redemption($1,$2,$3) result',[id,action,reason])).rows[0].result;
 const balance=async(id)=>Number((await as(id,'select public.student_dashboard() result')).rows[0].result.balance);
 await give('HS001');await give('HS002');
 await assert.rejects(redeem(teacher),/NOT_ALLOWED/);
 await assert.rejects(redeem(student,expensive),/INSUFFICIENT_POINTS/);
 assert.equal(await balance(student),100);
 await db.query('update public.rewards set stock=1 where id=$1',[gift]);
 const request=randomUUID(),receipt=await redeem(student,gift,request);assert.equal(receipt.points,40);assert.equal(await balance(student),60);
 assert.equal((await redeem(student,gift,request)).id,receipt.id);
 await assert.rejects(redeem(second,gift,request),/REQUEST_CONFLICT/);
 await assert.rejects(redeem(second),/OUT_OF_STOCK/);
 await assert.rejects(as(student,"select public.process_redemption($1,'CANCELLED','Test')",[receipt.id]),/NOT_ALLOWED/);
 await assert.rejects(process(receipt.id,'CANCELLED',''),/REASON_REQUIRED/);
 await process(receipt.id,'CANCELLED');await process(receipt.id,'CANCELLED');assert.equal(await balance(student),100);
 assert.equal((await db.query('select stock from public.rewards where id=$1',[gift])).rows[0].stock,1);
 assert.equal((await db.query("select count(*) n from public.point_transactions where kind='REFUND'")).rows[0].n,1);
 const collected=await redeem(student);await process(collected.id,'COLLECTED');await process(collected.id,'COLLECTED');
 await assert.rejects(process(collected.id,'CANCELLED'),/REDEMPTION_FINAL/);
 assert.equal(await balance(student),60);
 assert.equal((await as(second,'select * from public.reward_redemptions')).rows.length,0);
 const ranking=(await as(student,"select public.class_ranking('TOTAL') result")).rows[0].result;
 assert.equal(ranking.length,2);assert.equal(ranking[0].points,100);assert.equal(ranking[0].rank,1);assert.equal(ranking[1].rank,1);
 assert.equal(ranking[0].email,undefined);
 await assert.rejects(as(teacher,"select public.class_ranking('TOTAL')"),/NOT_ALLOWED/);
 await assert.rejects(as(student,"select public.class_ranking('YEAR')"),/INVALID_INPUT/);
 await db.query("update public.contributions set created_at=(date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')-interval '1 day') at time zone 'Asia/Ho_Chi_Minh' where student_id=$1",[second]);
 const monthly=(await as(student,"select public.class_ranking('MONTH') result")).rows[0].result;assert.equal(monthly.find(r=>r.id===c2).points,0);
 await db.exec('set role anon');const impact=(await db.query('select public.green_impact() result')).rows[0].result;await db.exec('reset role');
 assert.equal(impact.students,2);assert.equal(impact.kilograms,2);assert.equal(impact.contributions,2);assert.equal(impact.rewards,1);assert.equal(impact.weeks.length,8);
 await db.query('update public.contributions set reversed_at=now() where student_id=$1',[second]);
 const filtered=(await as(student,'select public.green_impact() result')).rows[0].result;assert.equal(filtered.students,1);assert.equal(filtered.kilograms,1);
 // Rollback must preserve balance, stock and receipt count on any failed ledger write.
 await db.query('update public.rewards set stock=2 where id=$1',[gift]);
 await db.exec("create function public.fail_reward_ledger() returns trigger language plpgsql as $$begin raise exception 'SIMULATED_FAILURE';end$$;create trigger fail_reward_ledger before insert on public.point_transactions for each row execute function public.fail_reward_ledger();");
 await assert.rejects(redeem(student),/SIMULATED_FAILURE/);assert.equal(await balance(student),60);
 assert.equal((await db.query('select stock from public.rewards where id=$1',[gift])).rows[0].stock,2);
 assert.equal((await db.query('select count(*) n from public.reward_redemptions')).rows[0].n,2);
 await db.exec('drop trigger fail_reward_ledger on public.point_transactions');
 await redeem(student);assert.equal(await balance(student),20);
 await assert.rejects(redeem(student),/INSUFFICIENT_POINTS/);
 assert.equal((await db.query('select stock from public.rewards where id=$1',[gift])).rows[0].stock,1,'failed overspend does not reduce stock');
 await db.query('update public.profiles set active=false where id=$1',[student]);
 await assert.rejects(redeem(student),/NOT_ALLOWED/);
 }finally{await db.close();}
});
