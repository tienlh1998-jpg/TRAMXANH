import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('Migration enforces role scopes and blocks all browser writes', async () => {
 const db = new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
   create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  await db.exec(await readFile(new URL('../supabase/migrations/202610080001_foundation.sql',import.meta.url),'utf8'));
  const ids = [1,2,3,4,5,6].map(n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`);
  const c1='10000000-0000-4000-8000-000000000001', c2='10000000-0000-4000-8000-000000000002';
  await db.exec(`insert into public.classes(id,name,school_year) values('${c1}','10A1','2026'),('${c2}','10A2','2026');`);
  for (const [i,id] of ids.entries()) {
   await db.query('insert into auth.users(id) values($1)',[id]);
   await db.query('insert into public.profiles(id,full_name,role,class_id,active) values($1,$2,$3,$4,$5)',[id,`User ${i}`,['STUDENT','STUDENT','TEACHER','STATION_OPERATOR','ADMIN','STUDENT'][i],i===1?c2:c1,i!==5]);
  }
  await db.query('insert into public.teacher_class_assignments values($1,$2)',[c1,ids[2]]);
  async function asUser(id, sql) {
   await db.exec('set role authenticated');
   await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
   try { return await db.query(sql); } finally { await db.exec('reset role'); }
  }
  assert.equal((await asUser(ids[0],'select * from public.profiles')).rows.length,1,'student only sees self');
  assert.equal((await asUser(ids[0],'select * from public.classes')).rows.length,1,'student only sees class');
  assert.equal((await asUser(ids[2],'select * from public.profiles')).rows.length,5,'teacher sees assigned class only');
  assert.equal((await asUser(ids[3],'select * from public.profiles')).rows.length,1,'operator cannot enumerate students');
  assert.equal((await asUser(ids[4],'select * from public.profiles')).rows.length,6,'admin sees profiles');
  assert.equal((await asUser(ids[5],'select * from public.profiles')).rows.length,0,'inactive account cannot read');
  await assert.rejects(asUser(ids[0],"update public.profiles set role='ADMIN'"),/permission denied/);
  await assert.rejects(asUser(ids[4],"delete from public.point_transactions"),/permission denied/);
  await assert.rejects(asUser(ids[0],"select * from public.qr_sessions"),/permission denied/);
  const tables=await db.query("select relname from pg_class where relnamespace='public'::regnamespace and relkind='r' and not relrowsecurity");
  assert.equal(tables.rows.length,0,'all public tables have RLS');
 } finally { await db.close(); }
});
