import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
test('Custom units: integer validation, snapshot history, separate kg statistics and admin email lookup',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 const directory=new URL('../supabase/migrations/',import.meta.url);for(const file of (await readdir(directory)).sort())await db.exec(await readFile(new URL(file,directory),'utf8'));
 await db.exec(await readFile(new URL('../supabase/seed/development_station.sql',import.meta.url),'utf8'));
 const admin=randomUUID(),student=randomUUID(),material=randomUUID();for(const [id,role,email]of[[admin,'ADMIN','admin@example.com'],[student,'STUDENT','student@example.com']]){await db.query('insert into auth.users values($1,$2)',[id,email]);await db.query('insert into public.profiles(id,full_name,role,active) values($1,$2,$3,true)',[id,role,role]);}
 async function as(id,sql,args=[]){await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);try{return await db.query(sql,args);}finally{await db.exec('reset role');}}
 const save=async(entity,id,data)=>as(admin,'select public.admin_save($1,$2,$3,$4,$5)',[entity,id,JSON.stringify(data),'Kiểm tra đơn vị',randomUUID()]);
 await save('profiles',student,{full_name:'Học sinh',role:'STUDENT',student_code:'HSNEW',active:true,class_id:''});
 assert.equal((await db.query('select email from public.profiles where id=$1',[student])).rows[0].email,'student@example.com');
 assert.equal((await as(admin,'select public.admin_auth_user($1) id',['STUDENT@example.com'])).rows[0].id,student);
 await assert.rejects(as(student,'select public.admin_auth_user($1)',['admin@example.com']),/NOT_ALLOWED/);
 const data={name:'Chai nhựa',unit:'chai',points_per_kg:'2',max_quantity:'1000',active:true};await save('material_types',material,data);
 const station='20000000-0000-4000-8000-000000000001';
 const context=(await as(student,'select public.station_context($1) result',[station])).rows[0].result;assert.equal(context.materials.find(m=>m.id===material).unit,'chai');
 const send=(id,n)=>as(student,'select public.submit_contribution_request($1,$2,$3,$4)',[id,station,material,n]);
 await assert.rejects(send(randomUUID(),1.5),/WHOLE_QUANTITY_REQUIRED/);await assert.rejects(send(randomUUID(),1001),/WEIGHT_TOO_HIGH/);
 const request=randomUUID();await send(request,100);await assert.rejects(save('material_types',material,{...data,unit:'thùng'}),/UNIT_PENDING/);
 const approve=(n)=>as(admin,'select public.review_contribution_request($1,$2,$3,$4)',[request,'APPROVED','Đã kiểm tra',n]);
 await assert.rejects(approve(1.5),/WHOLE_QUANTITY_REQUIRED/);await approve(100);await approve(100);
 const entry=(await db.query('select unit_snapshot,points from public.contributions')).rows[0];assert.equal(entry.unit_snapshot,'chai');assert.equal(entry.points,200);
 await save('material_types',material,{...data,unit:'thùng'});assert.equal((await db.query('select unit_snapshot from public.contributions')).rows[0].unit_snapshot,'chai');
 const report=(await as(admin,'select public.program_report() result')).rows[0].result;assert.equal(Number(report.kg),0);assert.equal(Number(report.points),200);assert.equal(Number(report.quantities.find(t=>t.unit==='chai').quantity),100);
 const impact=(await db.query('select public.green_impact() result')).rows[0].result;assert.equal(Number(impact.kilograms),0);assert.equal(impact.materials.find(m=>m.unit==='chai').kg,100);
 const dashboard=(await as(student,'select public.student_dashboard() result')).rows[0].result;assert.equal(Number(dashboard.kilograms),0);
 }finally{await db.close();}
});
