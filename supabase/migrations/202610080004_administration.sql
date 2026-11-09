begin;
alter table public.admin_audit_logs add column before_data jsonb;
alter table public.admin_audit_logs add column after_data jsonb;
create table private.admin_requests(request_id uuid primary key,actor_id uuid not null,fingerprint text not null,target_id uuid not null);
revoke all on private.admin_requests from public,anon,authenticated;

create function public.admin_save(p_entity text,p_id uuid,p_data jsonb,p_reason text,p_request uuid default gen_random_uuid()) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid:=coalesce(p_id,gen_random_uuid()); before_row jsonb; after_row jsonb; role_value public.app_role; delta integer; fingerprint text; existing private.admin_requests;
begin
 if not private.is_admin() then raise exception 'NOT_ALLOWED'; end if;
 if p_reason is null or length(trim(p_reason))<3 or length(p_reason)>500 or p_data is null then raise exception 'REASON_REQUIRED'; end if;
 if p_request is null then raise exception 'INVALID_INPUT'; end if;
 fingerprint:=encode(sha256(convert_to(jsonb_build_array(p_entity,p_id,p_data,p_reason)::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into existing from private.admin_requests where request_id=p_request;
 if found then
  if existing.actor_id<>auth.uid() or existing.fingerprint<>fingerprint then raise exception 'REQUEST_CONFLICT'; end if;
  return existing.target_id;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('admin:'||p_entity||':'||target::text,0));
 case p_entity
 when 'classes' then
  if length(trim(p_data->>'name')) not between 1 and 80 or length(trim(p_data->>'school_year')) not between 1 and 30 then raise exception 'INVALID_INPUT'; end if;
  select to_jsonb(t) into before_row from public.classes t where id=target for update;
  insert into public.classes(id,name,school_year,active) values(target,trim(p_data->>'name'),trim(p_data->>'school_year'),(p_data->>'active')::boolean)
  on conflict(id) do update set name=excluded.name,school_year=excluded.school_year,active=excluded.active;
  select to_jsonb(t) into after_row from public.classes t where id=target;
 when 'stations' then
  if length(trim(p_data->>'name')) not between 1 and 100 or length(coalesce(p_data->>'location',''))>200 then raise exception 'INVALID_INPUT'; end if;
  select to_jsonb(t) into before_row from public.stations t where id=target for update;
  insert into public.stations(id,name,location,active) values(target,trim(p_data->>'name'),trim(p_data->>'location'),(p_data->>'active')::boolean)
  on conflict(id) do update set name=excluded.name,location=excluded.location,active=excluded.active;
  select to_jsonb(t) into after_row from public.stations t where id=target;
 when 'material_types' then
  if length(trim(p_data->>'name')) not between 1 and 100 or (p_data->>'points_per_kg')::numeric not between 0.001 and 1000000 or (p_data->>'points_per_kg')::numeric<>round((p_data->>'points_per_kg')::numeric,3) then raise exception 'INVALID_INPUT'; end if;
  select to_jsonb(t) into before_row from public.material_types t where id=target for update;
  insert into public.material_types(id,name,points_per_kg,active) values(target,trim(p_data->>'name'),(p_data->>'points_per_kg')::numeric,(p_data->>'active')::boolean)
  on conflict(id) do update set name=excluded.name,points_per_kg=excluded.points_per_kg,active=excluded.active;
  select to_jsonb(t) into after_row from public.material_types t where id=target;
 when 'rewards' then
  delta:=(p_data->>'stock_delta')::integer;
  if delta is null or length(trim(p_data->>'name')) not between 1 and 120 or (p_data->>'points_cost')::integer not between 1 and 100000000 or delta not between -1000000 and 1000000 or length(coalesce(p_data->>'description',''))>1000 or length(coalesce(p_data->>'image_url',''))>1000 then raise exception 'INVALID_INPUT'; end if;
  select to_jsonb(t) into before_row from public.rewards t where id=target for update;
  insert into public.rewards(id,name,description,image_url,points_cost,stock,active) values(target,trim(p_data->>'name'),p_data->>'description',p_data->>'image_url',(p_data->>'points_cost')::integer,greatest(delta,0),(p_data->>'active')::boolean)
  on conflict(id) do update set name=excluded.name,description=excluded.description,image_url=excluded.image_url,points_cost=excluded.points_cost,stock=public.rewards.stock+delta,active=excluded.active;
  if before_row is null and delta<0 then raise exception 'INVALID_INPUT'; end if;
  select to_jsonb(t) into after_row from public.rewards t where id=target;
 when 'profiles' then
  if p_id is null or length(trim(p_data->>'full_name')) not between 1 and 120 then raise exception 'INVALID_INPUT'; end if;
  role_value:=(p_data->>'role')::public.app_role;
  if role_value is null then raise exception 'INVALID_INPUT'; end if;
  if target=auth.uid() and (role_value<>'ADMIN' or (p_data->>'active')::boolean is distinct from true) then raise exception 'SELF_LOCKOUT'; end if;
  perform pg_advisory_xact_lock(hashtextextended('admin-profile-roles',0));
  if not private.is_admin() then raise exception 'NOT_ALLOWED'; end if;
  select to_jsonb(t) into before_row from public.profiles t where id=target for update;
  if not exists(select 1 from auth.users where id=target) then raise exception 'AUTH_USER_REQUIRED'; end if;
  if role_value='STUDENT' and (nullif(trim(p_data->>'student_code'),'') is null or nullif(p_data->>'class_id','') is null) then raise exception 'STUDENT_FIELDS_REQUIRED'; end if;
  if length(coalesce(p_data->>'student_code',''))>40 then raise exception 'INVALID_INPUT'; end if;
  insert into public.profiles(id,full_name,role,class_id,student_code,active) values(target,trim(p_data->>'full_name'),role_value,nullif(p_data->>'class_id','')::uuid,upper(nullif(trim(p_data->>'student_code'),'')),(p_data->>'active')::boolean)
  on conflict(id) do update set full_name=excluded.full_name,role=excluded.role,class_id=excluded.class_id,student_code=excluded.student_code,active=excluded.active;
  select to_jsonb(t) into after_row from public.profiles t where id=target;
 else raise exception 'INVALID_INPUT';
 end case;
 insert into public.admin_audit_logs(actor_id,action,target_table,target_id,reason,before_data,after_data) values(auth.uid(),case when before_row is null then 'CREATE' else 'UPDATE' end,p_entity,target,trim(p_reason),before_row,after_row);
 insert into private.admin_requests values(p_request,auth.uid(),fingerprint,target);
 return target;
end $$;

create function public.admin_assign(p_scope text,p_member uuid,p_target uuid,p_assigned boolean,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare previous boolean;
begin
 if not private.is_admin() then raise exception 'NOT_ALLOWED'; end if;
 if p_reason is null or length(trim(p_reason))<3 or length(p_reason)>500 or p_assigned is null then raise exception 'REASON_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('assignment:'||p_scope||':'||p_member::text||':'||p_target::text,0));
 if p_scope='STATION' then
  if not exists(select 1 from public.profiles where id=p_member and role='STATION_OPERATOR') then raise exception 'ROLE_MISMATCH'; end if;
  select exists(select 1 from public.station_assignments where operator_id=p_member and station_id=p_target) into previous;
  if p_assigned then insert into public.station_assignments values(p_target,p_member) on conflict do nothing; else delete from public.station_assignments where operator_id=p_member and station_id=p_target; end if;
 elsif p_scope='CLASS' then
  if not exists(select 1 from public.profiles where id=p_member and role='TEACHER') then raise exception 'ROLE_MISMATCH'; end if;
  select exists(select 1 from public.teacher_class_assignments where teacher_id=p_member and class_id=p_target) into previous;
  if p_assigned then insert into public.teacher_class_assignments values(p_target,p_member) on conflict do nothing; else delete from public.teacher_class_assignments where teacher_id=p_member and class_id=p_target; end if;
 else raise exception 'INVALID_INPUT'; end if;
 if previous is distinct from p_assigned then insert into public.admin_audit_logs(actor_id,action,target_table,target_id,reason,before_data,after_data) values(auth.uid(),'ASSIGNMENT',p_scope,p_member,trim(p_reason),jsonb_build_object('target',p_target,'assigned',previous),jsonb_build_object('target',p_target,'assigned',p_assigned)); end if;
end $$;

create function public.admin_settings(p_max numeric,p_ttl integer,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare before_row jsonb;
begin
 if not private.is_admin() then raise exception 'NOT_ALLOWED'; end if;
 if p_max is null or p_max not between 0.001 and 1000 or p_max<>round(p_max,3) or p_ttl is null or p_ttl not between 30 and 600 then raise exception 'INVALID_INPUT'; end if;
 if p_reason is null or length(trim(p_reason))<3 or length(p_reason)>500 then raise exception 'REASON_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('system-settings',0));
 select to_jsonb(t) into before_row from public.system_settings t where id=true for update;
 insert into public.system_settings(id,max_weight_kg,qr_ttl_seconds) values(true,p_max,p_ttl) on conflict(id) do update set max_weight_kg=excluded.max_weight_kg,qr_ttl_seconds=excluded.qr_ttl_seconds;
 insert into public.admin_audit_logs(actor_id,action,target_table,target_id,reason,before_data,after_data) values(auth.uid(),'SETTINGS','system_settings','00000000-0000-4000-8000-000000000001',trim(p_reason),before_row,jsonb_build_object('max_weight_kg',p_max,'qr_ttl_seconds',p_ttl,'rounding_mode','FLOOR'));
end $$;

create function public.reverse_contribution(p_id uuid,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare entry public.contributions; student uuid; balance bigint;
begin
 if not private.is_admin() then raise exception 'NOT_ALLOWED'; end if;
 if p_reason is null or length(trim(p_reason))<3 or length(p_reason)>500 then raise exception 'REASON_REQUIRED'; end if;
 select student_id into student from public.contributions where id=p_id;
 if student is null then raise exception 'CONTRIBUTION_NOT_FOUND'; end if;
 perform 1 from public.profiles where id=student for update;
 select * into entry from public.contributions where id=p_id for update;
 if entry.reversed_at is not null then return jsonb_build_object('id',p_id,'reversed',true); end if;
 select coalesce(sum(amount),0) into balance from public.point_transactions where student_id=student;
 if balance<entry.points then raise exception 'REVERSAL_INSUFFICIENT_BALANCE'; end if;
 insert into public.point_transactions(student_id,amount,kind,contribution_id,actor_id) values(student,-entry.points,'REVERSAL',p_id,auth.uid());
 update public.contributions set reversed_at=clock_timestamp() where id=p_id;
 insert into public.admin_audit_logs(actor_id,action,target_table,target_id,reason,before_data,after_data) values(auth.uid(),'REVERSE','contributions',p_id,trim(p_reason),to_jsonb(entry),jsonb_build_object('reversed',true,'points_removed',entry.points));
 return jsonb_build_object('id',p_id,'reversed',true);
end $$;

create function public.program_report(p_from date default null,p_to date default null,p_class uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; role_value public.app_role:=private.current_role();
begin
 if role_value is null or role_value not in ('ADMIN','TEACHER') then raise exception 'NOT_ALLOWED'; end if;
 if p_from>p_to then raise exception 'INVALID_INPUT'; end if;
 with valid as (
 select x.*,c.name class_name,s.name station_name,m.name material_name from public.contributions x
 left join public.classes c on c.id=x.class_id join public.stations s on s.id=x.station_id join public.material_types m on m.id=x.material_id
 where x.reversed_at is null and (p_class is null or x.class_id=p_class) and (p_from is null or x.created_at>=p_from::timestamp at time zone 'Asia/Ho_Chi_Minh') and (p_to is null or x.created_at<(p_to+1)::timestamp at time zone 'Asia/Ho_Chi_Minh')
 and (role_value='ADMIN' or exists(select 1 from public.teacher_class_assignments a where a.teacher_id=auth.uid() and a.class_id=x.class_id))
 ), groups as (
 select 'CLASS' kind,class_id::text key,coalesce(class_name,'Chưa gán lớp') name,sum(weight_kg) kg,sum(points) points,count(*) contributions from valid group by class_id,class_name
 union all select 'STATION',station_id::text,station_name,sum(weight_kg),sum(points),count(*) from valid group by station_id,station_name
 union all select 'MATERIAL',material_id::text,material_name,sum(weight_kg),sum(points),count(*) from valid group by material_id,material_name
 union all select 'DAY',to_char(created_at at time zone 'Asia/Ho_Chi_Minh','YYYY-MM-DD'),to_char(created_at at time zone 'Asia/Ho_Chi_Minh','YYYY-MM-DD'),sum(weight_kg),sum(points),count(*) from valid group by to_char(created_at at time zone 'Asia/Ho_Chi_Minh','YYYY-MM-DD')
 union all select 'MONTH',to_char(created_at at time zone 'Asia/Ho_Chi_Minh','YYYY-MM'),to_char(created_at at time zone 'Asia/Ho_Chi_Minh','YYYY-MM'),sum(weight_kg),sum(points),count(*) from valid group by to_char(created_at at time zone 'Asia/Ho_Chi_Minh','YYYY-MM')
 ) select jsonb_build_object('students',(select count(*) from public.profiles p where p.role='STUDENT' and (p_class is null or p.class_id=p_class) and (role_value='ADMIN' or exists(select 1 from public.teacher_class_assignments a where a.teacher_id=auth.uid() and a.class_id=p.class_id))),
 'participants',(select count(distinct student_id) from valid),'kg',(select coalesce(sum(weight_kg),0) from valid),'contributions',(select count(*) from valid),'points',(select coalesce(sum(points),0) from valid),
 'points_redeemed',case when role_value='ADMIN' and p_class is null then (select coalesce(sum(r.points_cost),0) from public.reward_redemptions r where r.status<>'CANCELLED' and (p_from is null or r.created_at>=p_from::timestamp at time zone 'Asia/Ho_Chi_Minh') and (p_to is null or r.created_at<(p_to+1)::timestamp at time zone 'Asia/Ho_Chi_Minh')) else null end,
 'groups',(select coalesce(jsonb_agg(to_jsonb(g) order by g.kind,g.name),'[]'::jsonb) from groups g)) into result;
 return result;
end $$;

revoke all on function public.admin_save(text,uuid,jsonb,text,uuid),public.admin_assign(text,uuid,uuid,boolean,text),public.admin_settings(numeric,integer,text),public.reverse_contribution(uuid,text),public.program_report(date,date,uuid) from public,anon;
grant execute on function public.admin_save(text,uuid,jsonb,text,uuid),public.admin_assign(text,uuid,uuid,boolean,text),public.admin_settings(numeric,integer,text),public.reverse_contribution(uuid,text),public.program_report(date,date,uuid) to authenticated;
commit;
