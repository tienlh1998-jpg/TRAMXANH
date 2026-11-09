begin;
alter table public.reward_redemptions add column reward_name text not null default '';
update public.reward_redemptions r set reward_name=w.name from public.rewards w where w.id=r.reward_id;

create function public.redeem_reward(p_request uuid,p_reward uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare existing public.reward_redemptions; gift public.rewards; balance bigint;
begin
 if private.current_role() is distinct from 'STUDENT' then raise exception 'NOT_ALLOWED'; end if;
 if p_request is null or p_reward is null then raise exception 'INVALID_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into existing from public.reward_redemptions where request_id=p_request;
 if found then
  if existing.student_id<>auth.uid() or existing.reward_id<>p_reward then raise exception 'REQUEST_CONFLICT'; end if;
  return jsonb_build_object('id',existing.id,'code',existing.claim_code,'points',existing.points_cost,'status',existing.status);
 end if;
 perform 1 from public.profiles where id=auth.uid() and active and role='STUDENT' for update;
 if not found then raise exception 'NOT_ALLOWED'; end if;
 select * into gift from public.rewards where id=p_reward and active for update;
 if not found then raise exception 'REWARD_INVALID'; end if;
 if gift.stock<1 then raise exception 'OUT_OF_STOCK'; end if;
 select coalesce(sum(amount),0) into balance from public.point_transactions where student_id=auth.uid();
 if balance<gift.points_cost then raise exception 'INSUFFICIENT_POINTS'; end if;
 insert into public.reward_redemptions(request_id,student_id,reward_id,points_cost,reward_name)
 values(p_request,auth.uid(),gift.id,gift.points_cost,gift.name) returning * into existing;
 insert into public.point_transactions(student_id,amount,kind,redemption_id,actor_id) values(auth.uid(),-gift.points_cost,'REDEMPTION',existing.id,auth.uid());
 update public.rewards set stock=stock-1 where id=gift.id;
 return jsonb_build_object('id',existing.id,'code',existing.claim_code,'points',existing.points_cost,'status',existing.status);
end $$;

create function public.process_redemption(p_id uuid,p_action text,p_reason text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare receipt public.reward_redemptions; student uuid;
begin
 if not private.is_admin() then raise exception 'NOT_ALLOWED'; end if;
 if p_action is null or p_action not in ('COLLECTED','CANCELLED') then raise exception 'INVALID_INPUT'; end if;
 select student_id into student from public.reward_redemptions where id=p_id;
 if student is null then raise exception 'REDEMPTION_NOT_FOUND'; end if;
 perform 1 from public.profiles where id=student for update;
 select * into receipt from public.reward_redemptions where id=p_id for update;
 if receipt.status=p_action then return jsonb_build_object('id',receipt.id,'status',receipt.status); end if;
 if receipt.status<>'PENDING' then raise exception 'REDEMPTION_FINAL'; end if;
 if p_action='CANCELLED' then
  if p_reason is null or length(trim(p_reason))<3 or length(p_reason)>500 then raise exception 'REASON_REQUIRED'; end if;
  perform 1 from public.rewards where id=receipt.reward_id for update;
  insert into public.point_transactions(student_id,amount,kind,redemption_id,actor_id) values(receipt.student_id,receipt.points_cost,'REFUND',receipt.id,auth.uid());
  update public.rewards set stock=stock+1 where id=receipt.reward_id;
 end if;
 update public.reward_redemptions set status=p_action,processed_at=clock_timestamp(),processed_by=auth.uid() where id=receipt.id;
 insert into public.admin_audit_logs(actor_id,action,target_table,target_id,reason) values(auth.uid(),p_action,'reward_redemptions',receipt.id,case when p_action='COLLECTED' then 'Đã giao quà, đối chiếu mã phiếu' else trim(p_reason) end);
 return jsonb_build_object('id',receipt.id,'status',p_action);
end $$;

create function public.class_ranking(p_period text default 'TOTAL') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare since timestamptz; result jsonb;
begin
 if private.current_role() is null or private.current_role() not in ('STUDENT','ADMIN') then raise exception 'NOT_ALLOWED'; end if;
 if p_period is null or p_period not in ('WEEK','MONTH','TOTAL') then raise exception 'INVALID_INPUT'; end if;
 since := case p_period when 'WEEK' then date_trunc('week',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh' when 'MONTH' then date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh' else '-infinity'::timestamptz end;
 with totals as (
 select c.id,c.name,c.school_year,coalesce(sum(x.points),0) points,coalesce(sum(x.weight_kg),0) kg,count(x.id) contributions
 from public.classes c left join public.contributions x on x.class_id=c.id and x.reversed_at is null and x.created_at>=since and x.created_at<=now()
 where c.active group by c.id
 ), ranked as (select *,dense_rank() over(order by points desc) rank from totals)
 select coalesce(jsonb_agg(to_jsonb(ranked) order by rank,name,id),'[]'::jsonb) into result from ranked;
 return result;
end $$;

create function public.green_impact() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'students',(select count(distinct student_id) from public.contributions where reversed_at is null),
 'kilograms',(select coalesce(sum(weight_kg),0) from public.contributions where reversed_at is null),
 'contributions',(select count(*) from public.contributions where reversed_at is null),
 'rewards',(select count(*) from public.reward_redemptions where status='COLLECTED'),
 'materials',(select coalesce(jsonb_agg(to_jsonb(t) order by t.name),'[]'::jsonb) from (
  select m.name,coalesce(sum(c.weight_kg),0) kg from public.material_types m left join public.contributions c on c.material_id=m.id and c.reversed_at is null group by m.id having m.active or count(c.id)>0
 ) t),
 'weeks',(select jsonb_agg(to_jsonb(t) order by t.week) from (
  select to_char(w.start,'DD/MM') label,w.start::date week,coalesce(sum(c.weight_kg),0) kg
  from generate_series(date_trunc('week',now() at time zone 'Asia/Ho_Chi_Minh')-interval '7 weeks',date_trunc('week',now() at time zone 'Asia/Ho_Chi_Minh'),interval '1 week') w(start)
  left join public.contributions c on c.reversed_at is null and c.created_at>=w.start at time zone 'Asia/Ho_Chi_Minh' and c.created_at<(w.start+interval '1 week') at time zone 'Asia/Ho_Chi_Minh' and c.created_at<=now()
  group by w.start
 ) t)
 )
$$;
revoke all on function public.redeem_reward(uuid,uuid),public.process_redemption(uuid,text,text),public.class_ranking(text),public.green_impact() from public,anon;
grant execute on function public.redeem_reward(uuid,uuid),public.process_redemption(uuid,text,text),public.class_ranking(text),public.green_impact() to authenticated;
-- Public landing page exposes only aggregated program results, never identities.
grant execute on function public.green_impact() to anon;
commit;
