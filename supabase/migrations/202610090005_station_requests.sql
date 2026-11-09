begin;
create table public.contribution_requests(
 id uuid primary key,student_id uuid not null references public.profiles(id),station_id uuid not null references public.stations(id),material_id uuid not null references public.material_types(id),
 student_name text not null,class_name text,material_name text not null,weight_kg numeric(10,3) not null check(weight_kg>0),
 status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED')),
 contribution_id uuid unique references public.contributions(id),approved_weight numeric(10,3),points integer,
 created_at timestamptz not null default now(),processed_at timestamptz,processed_by uuid references public.profiles(id),reason text,
 check((status='APPROVED' and contribution_id is not null and points>0 and approved_weight>0) or (status in ('PENDING','REJECTED') and contribution_id is null))
);
alter table public.contribution_requests enable row level security;
revoke all on public.contribution_requests from public,anon,authenticated;
grant select on public.contribution_requests to authenticated;
create policy requests_read on public.contribution_requests for select to authenticated using((private.current_role()='STUDENT' and student_id=auth.uid()) or private.can_view_station(station_id));
create index requests_station_status on public.contribution_requests(station_id,status,created_at);
create policy active_station_student on public.stations for select to authenticated using(private.current_role()='STUDENT' and active);

create function public.station_context(p_station uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if private.current_role() is distinct from 'STUDENT' then raise exception 'NOT_ALLOWED'; end if;
 if not exists(select 1 from public.stations where id=p_station and active) then raise exception 'STATION_INVALID'; end if;
 select jsonb_build_object('id',s.id,'name',s.name,'location',s.location,'max_weight',(select max_weight_kg from public.system_settings where id=true),
 'materials',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'points_per_kg',m.points_per_kg) order by m.name),'[]'::jsonb) from public.material_types m where active)) into result from public.stations s where s.id=p_station;
 return result;
end $$;

create function public.submit_contribution_request(p_request uuid,p_station uuid,p_material uuid,p_weight numeric) returns jsonb language plpgsql security definer set search_path='' as $$
declare entry public.contribution_requests; student public.profiles; mat public.material_types; max_kg numeric; cls text;
begin
 if private.current_role() is distinct from 'STUDENT' then raise exception 'NOT_ALLOWED'; end if;
 if p_request is null or p_weight is null or p_weight<=0 or p_weight<>round(p_weight,3) or p_weight='NaN'::numeric then raise exception 'INVALID_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into entry from public.contribution_requests where id=p_request;
 if found then
  if entry.student_id<>auth.uid() or entry.station_id<>p_station or entry.material_id<>p_material or entry.weight_kg<>p_weight then raise exception 'REQUEST_CONFLICT'; end if;
  return jsonb_build_object('id',entry.id,'status',entry.status);
 end if;
 select * into student from public.profiles where id=auth.uid() and active and role='STUDENT' for update;
 if not found then raise exception 'NOT_ALLOWED'; end if;
 if not exists(select 1 from public.stations where id=p_station and active) then raise exception 'STATION_INVALID'; end if;
 select max_weight_kg into max_kg from public.system_settings where id=true;
 if max_kg is null then raise exception 'NOT_CONFIGURED'; end if;
 if p_weight>max_kg then raise exception 'WEIGHT_TOO_HIGH'; end if;
 select * into mat from public.material_types where id=p_material and active;
 if not found then raise exception 'MATERIAL_INVALID'; end if;
 if floor(mat.points_per_kg*p_weight)<1 or floor(mat.points_per_kg*p_weight)>2147483647 then raise exception 'POINTS_INVALID'; end if;
 select name into cls from public.classes where id=student.class_id;
 insert into public.contribution_requests(id,student_id,station_id,material_id,student_name,class_name,material_name,weight_kg)
 values(p_request,student.id,p_station,p_material,student.full_name,cls,mat.name,p_weight);
 return jsonb_build_object('id',p_request,'status','PENDING');
end $$;

create function public.review_contribution_request(p_id uuid,p_action text,p_reason text default '',p_weight numeric default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare entry public.contribution_requests; student uuid; station uuid; cls uuid; kg numeric; rate numeric; maximum numeric; award integer; contribution uuid;
begin
 select student_id,station_id into student,station from public.contribution_requests where id=p_id;
 if private.can_view_station(station) is distinct from true then raise exception 'NOT_ALLOWED'; end if;
 if p_action is null or p_action not in ('APPROVED','REJECTED') then raise exception 'INVALID_INPUT'; end if;
 perform 1 from public.profiles where id=student for update;
 select * into entry from public.contribution_requests where id=p_id for update;
 if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
 if entry.status=p_action then return jsonb_build_object('id',entry.id,'status',entry.status,'points',entry.points); end if;
 if entry.status<>'PENDING' then raise exception 'REQUEST_FINAL'; end if;
 if p_action='REJECTED' then
  if p_reason is null or length(trim(p_reason)) not between 3 and 500 then raise exception 'REASON_REQUIRED'; end if;
  update public.contribution_requests set status='REJECTED',processed_by=auth.uid(),processed_at=clock_timestamp(),reason=trim(p_reason) where id=p_id;
 else
  select class_id into cls from public.profiles where id=student and role='STUDENT' and active;
  if not found then raise exception 'STUDENT_NOT_FOUND'; end if;
  if not exists(select 1 from public.stations where id=station and active) then raise exception 'STATION_INVALID'; end if;
  kg:=coalesce(p_weight,entry.weight_kg);
  if kg<=0 or kg<>round(kg,3) or kg='NaN'::numeric then raise exception 'INVALID_INPUT'; end if;
  select max_weight_kg into maximum from public.system_settings where id=true;
  if maximum is null then raise exception 'NOT_CONFIGURED'; end if;
  if kg>maximum then raise exception 'WEIGHT_TOO_HIGH'; end if;
  select points_per_kg into rate from public.material_types where id=entry.material_id and active for share;
  if rate is null then raise exception 'MATERIAL_INVALID'; end if;
  if floor(rate*kg)<1 or floor(rate*kg)>2147483647 then raise exception 'POINTS_INVALID'; end if;
  award:=floor(rate*kg)::integer;
  insert into public.contributions(request_id,student_id,class_id,station_id,material_id,weight_kg,rate_snapshot,points,operator_id,identifier_hash)
  values(entry.id,student,cls,station,entry.material_id,kg,rate,award,auth.uid(),encode(sha256(convert_to('request:'||entry.id::text,'UTF8')),'hex')) returning id into contribution;
  insert into public.point_transactions(student_id,amount,kind,contribution_id,actor_id) values(student,award,'CONTRIBUTION',contribution,auth.uid());
  update public.contribution_requests set status='APPROVED',contribution_id=contribution,approved_weight=kg,points=award,processed_by=auth.uid(),processed_at=clock_timestamp(),reason='Đã cân và tiếp nhận' where id=p_id;
 end if;
 insert into public.admin_audit_logs(actor_id,action,target_table,target_id,reason,before_data,after_data) values(auth.uid(),p_action,'contribution_requests',p_id,case when p_action='REJECTED' then trim(p_reason) else 'Đã cân và tiếp nhận' end,to_jsonb(entry),jsonb_build_object('status',p_action,'points',award,'weight',kg));
 return jsonb_build_object('id',p_id,'status',p_action,'points',award);
end $$;
revoke all on function public.station_context(uuid),public.submit_contribution_request(uuid,uuid,uuid,numeric),public.review_contribution_request(uuid,text,text,numeric) from public,anon;
grant execute on function public.station_context(uuid),public.submit_contribution_request(uuid,uuid,uuid,numeric),public.review_contribution_request(uuid,text,text,numeric) to authenticated;
commit;
