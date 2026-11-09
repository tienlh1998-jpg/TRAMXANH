begin;
alter table public.material_types add column unit text not null default 'kg' check(length(trim(unit)) between 1 and 30);
alter table public.material_types add column max_quantity numeric(10,3) not null default 50 check(max_quantity>0 and max_quantity<=1000000);
alter table public.contribution_requests add column unit_snapshot text not null default 'kg';
alter table public.contributions add column unit_snapshot text not null default 'kg';
alter table public.profiles add column email text;
update public.profiles p set email=u.email from auth.users u where u.id=p.id;

-- Keep RPC signatures compatible; extend the audited save operation.
do $$ declare definition text; begin
 select pg_get_functiondef('public.admin_save(text,uuid,jsonb,text,uuid)'::regprocedure) into definition;
 definition:=replace(definition,'insert into public.material_types(id,name,points_per_kg,active) values(target,trim(p_data->>''name''),(p_data->>''points_per_kg'')::numeric,(p_data->>''active'')::boolean)',
 'if exists(select 1 from public.contribution_requests where material_id=target and status=''PENDING'') and exists(select 1 from public.material_types where id=target and unit<>coalesce(nullif(trim(p_data->>''unit''),''''),''kg'')) then raise exception ''UNIT_PENDING''; end if;
 insert into public.material_types(id,name,points_per_kg,active,unit,max_quantity) values(target,trim(p_data->>''name''),(p_data->>''points_per_kg'')::numeric,(p_data->>''active'')::boolean,coalesce(nullif(trim(p_data->>''unit''),''''),''kg''),coalesce(nullif(p_data->>''max_quantity'','''')::numeric,50))');
 definition:=replace(definition,'points_per_kg=excluded.points_per_kg,active=excluded.active','points_per_kg=excluded.points_per_kg,active=excluded.active,unit=excluded.unit,max_quantity=excluded.max_quantity');
 definition:=replace(definition,' or nullif(p_data->>''class_id'','''') is null','');
 definition:=replace(definition,'student_code,active) values(target','student_code,active,email) values(target');
 definition:=replace(definition,'upper(nullif(trim(p_data->>''student_code''),'''')),(p_data->>''active'')::boolean)', 'upper(nullif(trim(p_data->>''student_code''),'''')),(p_data->>''active'')::boolean,(select email from auth.users where id=target))');
 definition:=replace(definition,'student_code=excluded.student_code,active=excluded.active','student_code=excluded.student_code,active=excluded.active,email=excluded.email');
 execute definition;
end $$;

create function public.admin_auth_user(p_email text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; begin
 if private.is_admin() is distinct from true then raise exception 'NOT_ALLOWED'; end if;
 select id into result from auth.users where lower(email)=lower(trim(p_email));
 return result;
end $$;
revoke all on function public.admin_auth_user(text) from public,anon;
grant execute on function public.admin_auth_user(text) to authenticated;

create function private.quantity_snapshot() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='contributions' then
  select unit_snapshot into new.unit_snapshot from public.contribution_requests where id=new.request_id;
 end if;
 if new.unit_snapshot is null or tg_table_name='contribution_requests' then
  select unit into new.unit_snapshot from public.material_types where id=new.material_id;
 end if;
 if new.unit_snapshot<>'kg' and new.weight_kg<>trunc(new.weight_kg) then raise exception 'WHOLE_QUANTITY_REQUIRED'; end if;
 return new;
end $$;
revoke all on function private.quantity_snapshot() from public,anon,authenticated;
create trigger request_quantity before insert on public.contribution_requests for each row execute function private.quantity_snapshot();
create trigger contribution_quantity before insert on public.contributions for each row execute function private.quantity_snapshot();

do $$ declare definition text; begin
 select pg_get_functiondef('public.station_context(uuid)'::regprocedure) into definition;
 definition:=replace(definition,'''points_per_kg'',m.points_per_kg','''points_per_kg'',m.points_per_kg,''unit'',m.unit,''max_quantity'',m.max_quantity');execute definition;
 select pg_get_functiondef('public.submit_contribution_request(uuid,uuid,uuid,numeric)'::regprocedure) into definition;
 definition:=replace(definition,'if p_weight>max_kg then raise exception ''WEIGHT_TOO_HIGH''; end if;','');
 definition:=replace(definition,'if not found then raise exception ''MATERIAL_INVALID''; end if;', 'if not found then raise exception ''MATERIAL_INVALID''; end if;
 if p_weight>(case when mat.unit=''kg'' then least(max_kg,mat.max_quantity) else mat.max_quantity end) then raise exception ''WEIGHT_TOO_HIGH''; end if;
 if mat.unit<>''kg'' and p_weight<>trunc(p_weight) then raise exception ''WHOLE_QUANTITY_REQUIRED''; end if;');execute definition;
 select pg_get_functiondef('public.review_contribution_request(uuid,text,text,numeric)'::regprocedure) into definition;
 definition:=replace(definition,'if kg>maximum then raise exception ''WEIGHT_TOO_HIGH''; end if;', 'select case when unit=''kg'' then least(maximum,max_quantity) else max_quantity end into maximum from public.material_types where id=entry.material_id;
 if kg>maximum then raise exception ''WEIGHT_TOO_HIGH''; end if;
 if entry.unit_snapshot<>''kg'' and kg<>trunc(kg) then raise exception ''WHOLE_QUANTITY_REQUIRED''; end if;');execute definition;
 -- All kg totals exclude quantities recorded in bottles/boxes/etc.
 select pg_get_functiondef('public.program_report(date,date,uuid)'::regprocedure) into definition;
 definition:=replace(definition,'sum(weight_kg)','sum(case when unit_snapshot=''kg'' then weight_kg else 0 end)');
 definition:=replace(definition,'''groups'',','''material_totals'',(select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from (select material_name name,unit_snapshot unit,sum(weight_kg) quantity,sum(points) points,count(*) contributions from valid group by material_name,unit_snapshot) t),''quantities'',(select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from (select unit_snapshot unit,sum(weight_kg) quantity from valid group by unit_snapshot) t),''groups'',');execute definition;
 select pg_get_functiondef('public.student_dashboard()'::regprocedure) into definition;
 definition:=replace(definition,'sum(weight_kg)','sum(case when unit_snapshot=''kg'' then weight_kg else 0 end)');execute definition;
 select pg_get_functiondef('public.class_ranking(text)'::regprocedure) into definition;
 definition:=replace(definition,'sum(x.weight_kg)','sum(case when x.unit_snapshot=''kg'' then x.weight_kg else 0 end)');execute definition;
 select pg_get_functiondef('public.green_impact()'::regprocedure) into definition;
 definition:=replace(definition,'sum(weight_kg)','sum(case when unit_snapshot=''kg'' then weight_kg else 0 end)');
 definition:=replace(definition,'sum(c.weight_kg)','sum(case when c.unit_snapshot=''kg'' then c.weight_kg else 0 end)');
 -- Material totals split by historic unit, even if the catalog changes later.
 definition:=replace(definition,'select m.name,coalesce(sum(case when c.unit_snapshot=''kg'' then c.weight_kg else 0 end),0) kg','select m.name,coalesce(c.unit_snapshot,m.unit) unit,coalesce(sum(c.weight_kg),0) kg');
 definition:=replace(definition,'group by m.id having','group by m.id,c.unit_snapshot having');execute definition;
end $$;
commit;

