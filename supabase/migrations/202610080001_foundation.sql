begin;
create type public.app_role as enum ('STUDENT','STATION_OPERATOR','TEACHER','ADMIN');
create table public.classes (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 80),
 school_year text not null, active boolean not null default true, unique(name, school_year)
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete restrict,
 full_name text not null check(length(full_name) between 1 and 120),
 role public.app_role not null default 'STUDENT',
 class_id uuid references public.classes(id) on delete restrict,
 student_code text unique, active boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.stations (id uuid primary key default gen_random_uuid(), name text not null, location text, active boolean not null default true);
create table public.station_assignments (station_id uuid references public.stations(id) on delete restrict, operator_id uuid references public.profiles(id) on delete restrict, primary key(station_id,operator_id));
create table public.teacher_class_assignments (class_id uuid references public.classes(id) on delete restrict, teacher_id uuid references public.profiles(id) on delete restrict, primary key(class_id,teacher_id));
create table public.material_types (id uuid primary key default gen_random_uuid(), name text not null unique, points_per_kg numeric(12,3) not null check(points_per_kg>0), active boolean not null default true);
create table public.contributions (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 student_id uuid not null references public.profiles(id), class_id uuid references public.classes(id),
 station_id uuid not null references public.stations(id), material_id uuid not null references public.material_types(id),
 weight_kg numeric(10,3) not null check(weight_kg>0), rate_snapshot numeric(12,3) not null check(rate_snapshot>0),
 points integer not null check(points>=0), operator_id uuid not null references public.profiles(id),
 created_at timestamptz not null default now(), reversed_at timestamptz
);
create table public.rewards (id uuid primary key default gen_random_uuid(), name text not null, description text, image_url text, points_cost integer not null check(points_cost>0), stock integer not null check(stock>=0), active boolean not null default true);
create table public.reward_redemptions (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 student_id uuid not null references public.profiles(id), reward_id uuid not null references public.rewards(id),
 points_cost integer not null check(points_cost>0), claim_code uuid not null unique default gen_random_uuid(),
 status text not null default 'PENDING' check(status in ('PENDING','COLLECTED','CANCELLED')),
 created_at timestamptz not null default now(), processed_at timestamptz, processed_by uuid references public.profiles(id)
);
create table public.point_transactions (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id),
 amount integer not null check(amount<>0), kind text not null check(kind in ('CONTRIBUTION','REDEMPTION','REVERSAL','REFUND')),
 contribution_id uuid references public.contributions(id), redemption_id uuid references public.reward_redemptions(id),
 actor_id uuid not null references public.profiles(id), created_at timestamptz not null default now(),
 check((kind='CONTRIBUTION' and amount>0 and contribution_id is not null and redemption_id is null) or
 (kind='REVERSAL' and amount<0 and contribution_id is not null and redemption_id is null) or
 (kind='REDEMPTION' and amount<0 and redemption_id is not null and contribution_id is null) or
 (kind='REFUND' and amount>0 and redemption_id is not null and contribution_id is null))
);
create unique index contribution_point_once on public.point_transactions(contribution_id,kind) where contribution_id is not null;
create unique index redemption_point_once on public.point_transactions(redemption_id,kind) where redemption_id is not null;
create index contributions_student_time on public.contributions(student_id,created_at desc);
create index ledger_student on public.point_transactions(student_id);
create table public.qr_sessions (id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id), token_hash text not null unique, expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now(), check(expires_at>created_at));
create table public.admin_audit_logs (id uuid primary key default gen_random_uuid(), actor_id uuid not null references public.profiles(id), action text not null, target_table text not null, target_id uuid not null, reason text not null check(length(reason)>0), created_at timestamptz not null default now());
create table public.system_settings (id boolean primary key default true check(id), rounding_mode text not null default 'FLOOR' check(rounding_mode='FLOOR'), max_weight_kg numeric(10,3) not null check(max_weight_kg>0), qr_ttl_seconds integer not null check(qr_ttl_seconds between 30 and 600));
-- Configuration values await approval. No pilot or demo data is inserted here.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create function private.current_role() returns public.app_role language sql stable security definer set search_path='' as $$
 select role from public.profiles where id=(select auth.uid()) and active=true
$$;
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select coalesce(private.current_role()='ADMIN',false) $$;
create function private.can_view_student(student uuid, classroom uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.current_role() is not null and (student=(select auth.uid()) or private.is_admin() or
 (private.current_role()='TEACHER' and exists(select 1 from public.teacher_class_assignments where teacher_id=(select auth.uid()) and class_id=classroom)))
$$;
create function private.can_view_station(station uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_admin() or (private.current_role()='STATION_OPERATOR' and exists(select 1 from public.station_assignments where operator_id=(select auth.uid()) and station_id=station))
$$;
revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

do $$ declare t text; begin
 foreach t in array array['classes','profiles','stations','station_assignments','teacher_class_assignments','material_types','contributions','point_transactions','rewards','reward_redemptions','qr_sessions','admin_audit_logs','system_settings'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;
grant select on public.classes, public.profiles, public.stations, public.station_assignments, public.teacher_class_assignments, public.material_types, public.contributions, public.point_transactions, public.rewards, public.reward_redemptions, public.admin_audit_logs, public.system_settings to authenticated;
create policy profiles_read on public.profiles for select to authenticated using (private.can_view_student(id,class_id));
create policy classes_read on public.classes for select to authenticated using (
 private.is_admin() or (private.current_role() is not null and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.class_id=classes.id)) or
 (private.current_role()='TEACHER' and exists(select 1 from public.teacher_class_assignments a where a.teacher_id=(select auth.uid()) and a.class_id=classes.id))
);
create policy materials_read on public.material_types for select to authenticated using (private.current_role() is not null and (active or private.is_admin()));
create policy rewards_read on public.rewards for select to authenticated using (private.current_role() is not null and (active or private.is_admin()));
create policy stations_read on public.stations for select to authenticated using (private.can_view_station(id));
create policy station_assignments_read on public.station_assignments for select to authenticated using (private.is_admin() or (private.current_role()='STATION_OPERATOR' and operator_id=(select auth.uid())));
create policy teacher_assignments_read on public.teacher_class_assignments for select to authenticated using (private.is_admin() or (private.current_role()='TEACHER' and teacher_id=(select auth.uid())));
create policy contributions_read on public.contributions for select to authenticated using (private.can_view_student(student_id,class_id) or private.can_view_station(station_id));
create policy ledger_read on public.point_transactions for select to authenticated using (private.is_admin() or (private.current_role()='STUDENT' and student_id=(select auth.uid())));
create policy redemptions_read on public.reward_redemptions for select to authenticated using (private.is_admin() or (private.current_role()='STUDENT' and student_id=(select auth.uid())));
create policy audit_read on public.admin_audit_logs for select to authenticated using (private.is_admin());
create policy settings_read on public.system_settings for select to authenticated using (private.is_admin() or private.current_role()='STATION_OPERATOR');
-- All client writes are denied. Phase 2/3 introduce transactional RPC functions.
-- Account provisioning is performed by the trusted project administrator, never from signup metadata.
commit;
