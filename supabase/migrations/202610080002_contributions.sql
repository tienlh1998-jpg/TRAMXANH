begin;
alter table public.contributions add column identifier_hash text;
create function public.issue_student_qr() returns jsonb language plpgsql security definer set search_path='' as $$
declare token text; ttl integer; expiry timestamptz;
begin
 if private.current_role() is distinct from 'STUDENT' then raise exception 'NOT_ALLOWED'; end if;
 select qr_ttl_seconds into ttl from public.system_settings where id=true;
 if ttl is null then raise exception 'NOT_CONFIGURED'; end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 delete from public.qr_sessions where student_id=auth.uid();
 token := 'eco:' || replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
 expiry := clock_timestamp()+make_interval(secs=>ttl);
 insert into public.qr_sessions(student_id,token_hash,expires_at) values(auth.uid(),encode(sha256(convert_to(token,'UTF8')),'hex'),expiry);
 return jsonb_build_object('token',token,'expires_at',expiry);
end $$;

create function private.resolve_student(identifier text) returns uuid language plpgsql security definer set search_path='' as $$
declare student uuid;
begin
 if identifier like 'eco:%' then
  select student_id into student from public.qr_sessions where token_hash=encode(sha256(convert_to(identifier,'UTF8')),'hex') and expires_at>clock_timestamp() and used_at is null;
  if student is null then raise exception 'QR_INVALID'; end if;
 else
  select id into student from public.profiles where student_code=upper(trim(identifier)) and role='STUDENT' and active;
 end if;
 if not exists(select 1 from public.profiles where id=student and role='STUDENT' and active) then raise exception 'STUDENT_NOT_FOUND'; end if;
 return student;
end $$;

create function public.identify_student(p_station uuid,p_identifier text) returns jsonb language plpgsql security definer set search_path='' as $$
declare student uuid; result jsonb;
begin
 if private.can_view_station(p_station) is distinct from true or not exists(select 1 from public.stations where id=p_station and active) then raise exception 'NOT_ALLOWED'; end if;
 if length(p_identifier)>100 then raise exception 'INVALID_INPUT'; end if;
 student := private.resolve_student(p_identifier);
 select jsonb_build_object('id',p.id,'name',p.full_name,'class_name',c.name,'code',p.student_code) into result from public.profiles p left join public.classes c on c.id=p.class_id where p.id=student;
 return result;
end $$;

create function public.confirm_contribution(p_request uuid,p_station uuid,p_identifier text,p_material uuid,p_weight numeric) returns jsonb language plpgsql security definer set search_path='' as $$
declare student uuid; cls uuid; rate numeric; max_kg numeric; award integer; entry public.contributions; qr uuid;
begin
 if private.can_view_station(p_station) is distinct from true or not exists(select 1 from public.stations where id=p_station and active) then raise exception 'NOT_ALLOWED'; end if;
 if p_request is null or p_weight is null or p_weight<=0 or p_weight<>round(p_weight,3) or p_weight='NaN'::numeric or length(p_identifier)>100 or p_identifier is null then raise exception 'INVALID_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into entry from public.contributions where request_id=p_request;
 if found then
  if entry.operator_id<>auth.uid() or entry.station_id<>p_station or entry.material_id<>p_material or entry.weight_kg<>p_weight or entry.identifier_hash is distinct from encode(sha256(convert_to(p_identifier,'UTF8')),'hex') then raise exception 'REQUEST_CONFLICT'; end if;
  return jsonb_build_object('id',entry.id,'points',entry.points,'weight',entry.weight_kg,'duplicate',true);
 end if;
 student := private.resolve_student(p_identifier);
 select class_id into cls from public.profiles where id=student and active and role='STUDENT' for update;
 if not found then raise exception 'STUDENT_NOT_FOUND'; end if;
 if p_identifier like 'eco:%' then
  select id into qr from public.qr_sessions where token_hash=encode(sha256(convert_to(p_identifier,'UTF8')),'hex') and used_at is null and expires_at>clock_timestamp() for update;
  if qr is null then raise exception 'QR_INVALID'; end if;
 end if;
 select max_weight_kg into max_kg from public.system_settings where id=true;
 if max_kg is null then raise exception 'NOT_CONFIGURED'; end if;
 if p_weight>max_kg then raise exception 'WEIGHT_TOO_HIGH'; end if;
 select points_per_kg into rate from public.material_types where id=p_material and active for share;
 if rate is null then raise exception 'MATERIAL_INVALID'; end if;
 if floor(rate*p_weight)<1 or floor(rate*p_weight)>2147483647 then raise exception 'POINTS_INVALID'; end if;
 award := floor(rate*p_weight)::integer;
 insert into public.contributions(request_id,student_id,class_id,station_id,material_id,weight_kg,rate_snapshot,points,operator_id,identifier_hash)
 values(p_request,student,cls,p_station,p_material,p_weight,rate,award,auth.uid(),encode(sha256(convert_to(p_identifier,'UTF8')),'hex')) returning * into entry;
 insert into public.point_transactions(student_id,amount,kind,contribution_id,actor_id) values(student,award,'CONTRIBUTION',entry.id,auth.uid());
 if qr is not null then update public.qr_sessions set used_at=clock_timestamp() where id=qr; end if;
 return jsonb_build_object('id',entry.id,'points',award,'weight',p_weight,'duplicate',false);
end $$;

create function public.student_dashboard() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare cls uuid; result jsonb;
begin
 if private.current_role() is distinct from 'STUDENT' then raise exception 'NOT_ALLOWED'; end if;
 select class_id into cls from public.profiles where id=auth.uid();
 select jsonb_build_object(
 'balance',(select coalesce(sum(amount),0) from public.point_transactions where student_id=auth.uid()),
 'kilograms',(select coalesce(sum(weight_kg),0) from public.contributions where student_id=auth.uid() and reversed_at is null),
 'count',(select count(*) from public.contributions where student_id=auth.uid() and reversed_at is null),
 'school_kg',(select coalesce(sum(weight_kg),0) from public.contributions where reversed_at is null),
 'class_rank',(select place from (select class_id,dense_rank() over(order by sum(points) desc) place from public.contributions where reversed_at is null and class_id is not null group by class_id) ranks where class_id=cls)
 ) into result;
 return result;
end $$;
-- Limited station display names for students' own history, no profile enumeration.
create policy student_station_names on public.stations for select to authenticated using(private.current_role()='STUDENT' and exists(select 1 from public.contributions where student_id=auth.uid() and station_id=stations.id));
revoke all on function private.resolve_student(text) from public, anon, authenticated;
revoke all on function public.issue_student_qr(), public.identify_student(uuid,text), public.confirm_contribution(uuid,uuid,text,uuid,numeric), public.student_dashboard() from public, anon;
grant execute on function public.issue_student_qr(), public.identify_student(uuid,text), public.confirm_contribution(uuid,uuid,text,uuid,numeric), public.student_dashboard() to authenticated;
commit;
