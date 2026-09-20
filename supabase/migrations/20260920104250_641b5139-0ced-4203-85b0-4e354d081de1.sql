do $$
begin
  create type public.attendance_session_status as enum ('ACTIVE', 'CLOSED');
exception
  when duplicate_object then null;
end $$;

-- This composite key lets the database enforce that a session starter owns the
-- class offering, independently of the application server.
create unique index if not exists class_offerings_id_faculty_id_key
  on public.class_offerings (id, faculty_id);

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  class_offering_id uuid not null,
  started_by uuid not null,
  status public.attendance_session_status not null default 'ACTIVE',
  started_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  foreign key (class_offering_id, started_by)
    references public.class_offerings (id, faculty_id)
    on delete cascade,
  check (expires_at > started_at),
  check (
    (status = 'ACTIVE' and closed_at is null)
    or (status = 'CLOSED' and closed_at is not null)
  )
);

create table if not exists public.attendance_challenges (
  id uuid primary key default gen_random_uuid(),
  attendance_session_id uuid not null references public.attendance_sessions (id) on delete cascade,
  challenge_token uuid not null default gen_random_uuid() unique,
  issued_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (attendance_session_id),
  check (expires_at > issued_at)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  attendance_session_id uuid not null references public.attendance_sessions (id) on delete cascade,
  student_id uuid not null references public.student_profiles (user_id) on delete cascade,
  marked_at timestamptz not null default timezone('utc', now()),
  unique (attendance_session_id, student_id)
);

create index if not exists attendance_sessions_class_offering_idx
  on public.attendance_sessions (class_offering_id, created_at desc);
create index if not exists attendance_sessions_started_by_idx
  on public.attendance_sessions (started_by, status, expires_at);
create unique index if not exists attendance_sessions_one_active_per_class_idx
  on public.attendance_sessions (class_offering_id)
  where status = 'ACTIVE';
create index if not exists attendance_challenges_session_idx
  on public.attendance_challenges (attendance_session_id, expires_at);
create index if not exists attendance_records_student_idx
  on public.attendance_records (student_id, marked_at desc);

create or replace function public.prevent_attendance_session_reopen()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.class_offering_id is distinct from new.class_offering_id
     or old.started_by is distinct from new.started_by then
    raise exception 'Attendance session ownership cannot be changed';
  end if;

  if old.status = 'CLOSED' and new.status <> 'CLOSED' then
    raise exception 'Closed attendance sessions cannot be reopened';
  end if;

  return new;
end;
$$;

drop trigger if exists attendance_session_identity_guard on public.attendance_sessions;
create trigger attendance_session_identity_guard
  before update on public.attendance_sessions
  for each row execute function public.prevent_attendance_session_reopen();

create or replace function public.faculty_owns_attendance_session(
  attendance_session_id uuid,
  faculty_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.attendance_sessions s
    join public.class_offerings c on c.id = s.class_offering_id
    where s.id = attendance_session_id
      and s.started_by = faculty_user_id
      and c.faculty_id = faculty_user_id
      and faculty_user_id = auth.uid()
  );
$$;

create or replace function public.student_can_access_attendance_session(
  attendance_session_id uuid,
  student_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.attendance_sessions s
    join public.enrollments e on e.class_offering_id = s.class_offering_id
    where s.id = attendance_session_id
      and e.student_id = student_user_id
      and s.status = 'ACTIVE'
      and s.started_at <= now()
      and s.expires_at > now()
      and student_user_id = auth.uid()
  );
$$;

revoke all on function public.faculty_owns_attendance_session(uuid, uuid) from public;
grant execute on function public.faculty_owns_attendance_session(uuid, uuid) to authenticated;
revoke all on function public.student_can_access_attendance_session(uuid, uuid) from public;
grant execute on function public.student_can_access_attendance_session(uuid, uuid) to authenticated;

create or replace function public.get_attendance_submission_context(
  p_attendance_session_id uuid,
  p_challenge_token uuid
)
returns table (
  student_profile_exists boolean,
  session_exists boolean,
  session_id uuid,
  session_status public.attendance_session_status,
  session_started_at timestamptz,
  session_expires_at timestamptz,
  challenge_exists boolean,
  challenge_session_id uuid,
  challenge_expires_at timestamptz,
  enrolled boolean,
  already_recorded boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.student_profiles where user_id = auth.uid()
    ),
    s.id is not null,
    requested.session_id,
    s.status,
    s.started_at,
    s.expires_at,
    c.id is not null,
    c.attendance_session_id,
    c.expires_at,
    exists (
      select 1
      from public.enrollments e
      where e.student_id = auth.uid()
        and e.class_offering_id = s.class_offering_id
    ),
    exists (
      select 1
      from public.attendance_records r
      where r.attendance_session_id = requested.session_id
        and r.student_id = auth.uid()
    )
  from (select p_attendance_session_id as session_id) requested
  left join public.attendance_sessions s on s.id = requested.session_id
  left join public.attendance_challenges c
    on c.attendance_session_id = requested.session_id
   and c.challenge_token = p_challenge_token
  where auth.uid() is not null
    and public.current_app_role() = 'STUDENT'::public.app_role;
$$;

revoke all on function public.get_attendance_submission_context(uuid, uuid) from public;
grant execute on function public.get_attendance_submission_context(uuid, uuid) to authenticated;

create or replace function public.start_attendance_session(
  p_class_offering_id uuid,
  p_duration_seconds integer
)
returns table (
  session_id uuid,
  class_offering_id uuid,
  started_by uuid,
  status public.attendance_session_status,
  started_at timestamptz,
  expires_at timestamptz,
  closed_at timestamptz,
  session_created_at timestamptz,
  challenge_id uuid,
  challenge_token uuid,
  challenge_issued_at timestamptz,
  challenge_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.attendance_sessions;
  v_challenge public.attendance_challenges;
  v_started_at timestamptz;
  v_expires_at timestamptz;
begin
  if auth.uid() is null
     or public.current_app_role() is distinct from 'FACULTY'::public.app_role
     or not public.faculty_owns_class(p_class_offering_id, auth.uid()) then
    raise exception 'Faculty ownership is required to start attendance'
      using errcode = '42501';
  end if;

  if p_duration_seconds is null or p_duration_seconds not between 30 and 3600 then
    raise exception 'Attendance duration must be between 30 and 3600 seconds'
      using errcode = '22023';
  end if;

  -- Expired windows no longer block the one-active-session constraint.
  update public.attendance_sessions as s
  set status = 'CLOSED',
      closed_at = coalesce(s.closed_at, now())
  where s.class_offering_id = p_class_offering_id
    and s.started_by = auth.uid()
    and s.status = 'ACTIVE'
    and s.expires_at <= now();

  v_started_at := now();
  v_expires_at := v_started_at + make_interval(secs => p_duration_seconds);

  insert into public.attendance_sessions (
    class_offering_id,
    started_by,
    started_at,
    expires_at
  )
  values (
    p_class_offering_id,
    auth.uid(),
    v_started_at,
    v_expires_at
  )
  returning * into v_session;

  insert into public.attendance_challenges (
    attendance_session_id,
    issued_at,
    expires_at
  )
  values (
    v_session.id,
    v_started_at,
    v_expires_at
  )
  returning * into v_challenge;

  return query
  select
    v_session.id,
    v_session.class_offering_id,
    v_session.started_by,
    v_session.status,
    v_session.started_at,
    v_session.expires_at,
    v_session.closed_at,
    v_session.created_at,
    v_challenge.id,
    v_challenge.challenge_token,
    v_challenge.issued_at,
    v_challenge.expires_at;
end;
$$;

create or replace function public.close_attendance_session(
  p_attendance_session_id uuid
)
returns setof public.attendance_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.attendance_sessions;
begin
  if auth.uid() is null
     or public.current_app_role() is distinct from 'FACULTY'::public.app_role
     or not public.faculty_owns_attendance_session(p_attendance_session_id, auth.uid()) then
    raise exception 'Faculty ownership is required to close attendance'
      using errcode = '42501';
  end if;

  update public.attendance_sessions
  set status = 'CLOSED',
      closed_at = now()
  where id = p_attendance_session_id
    and status = 'ACTIVE'
  returning * into v_session;

  if not found then
    raise exception 'Attendance session was not active'
      using errcode = 'P0002';
  end if;

  return next v_session;
end;
$$;

create or replace function public.submit_attendance_challenge(
  p_attendance_session_id uuid,
  p_challenge_token uuid
)
returns setof public.attendance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_session public.attendance_sessions;
  v_challenge public.attendance_challenges;
  v_record public.attendance_records;
begin
  if v_student_id is null
     or public.current_app_role() is distinct from 'STUDENT'::public.app_role then
    raise exception 'Student authentication is required to submit attendance'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.student_profiles where user_id = v_student_id
  ) then
    raise exception 'Student profile is required to submit attendance'
      using errcode = 'P0007';
  end if;

  select * into v_session
  from public.attendance_sessions
  where id = p_attendance_session_id
  for update;

  if not found then
    raise exception 'Attendance session was not found'
      using errcode = 'P0002';
  end if;

  if v_session.status <> 'ACTIVE' then
    raise exception 'Attendance session is closed'
      using errcode = 'P0004';
  end if;

  if now() < v_session.started_at or now() >= v_session.expires_at then
    raise exception 'Attendance session has expired or has not started'
      using errcode = 'P0005';
  end if;

  select * into v_challenge
  from public.attendance_challenges
  where attendance_session_id = p_attendance_session_id
    and challenge_token = p_challenge_token;

  if not found then
    raise exception 'Attendance challenge is invalid'
      using errcode = 'P0003';
  end if;

  if now() >= v_challenge.expires_at then
    raise exception 'Attendance challenge has expired'
      using errcode = 'P0005';
  end if;

  if not exists (
    select 1
    from public.enrollments
    where student_id = v_student_id
      and class_offering_id = v_session.class_offering_id
  ) then
    raise exception 'Student is not enrolled in this class'
      using errcode = 'P0006';
  end if;

  if exists (
    select 1
    from public.attendance_records
    where attendance_session_id = p_attendance_session_id
      and student_id = v_student_id
  ) then
    raise exception 'Attendance has already been recorded'
      using errcode = 'P0008';
  end if;

  begin
    insert into public.attendance_records (attendance_session_id, student_id)
    values (p_attendance_session_id, v_student_id)
    returning * into v_record;
  exception
    when unique_violation then
      raise exception 'Attendance has already been recorded'
        using errcode = 'P0008';
  end;

  return next v_record;
end;
$$;

revoke all on function public.start_attendance_session(uuid, integer) from public;
grant execute on function public.start_attendance_session(uuid, integer) to authenticated;
revoke all on function public.close_attendance_session(uuid) from public;
grant execute on function public.close_attendance_session(uuid) to authenticated;
revoke all on function public.submit_attendance_challenge(uuid, uuid) from public;
grant execute on function public.submit_attendance_challenge(uuid, uuid) to authenticated;

alter table public.attendance_sessions enable row level security;
alter table public.attendance_challenges enable row level security;
alter table public.attendance_records enable row level security;

revoke all on table
  public.attendance_sessions,
  public.attendance_challenges,
  public.attendance_records
from public;

grant select on public.attendance_sessions to authenticated;
grant select on public.attendance_challenges to authenticated;
grant select on public.attendance_records to authenticated;
grant all on public.attendance_sessions to service_role;
grant all on public.attendance_challenges to service_role;
grant all on public.attendance_records to service_role;

drop policy if exists attendance_sessions_select_scoped on public.attendance_sessions;
create policy attendance_sessions_select_scoped
  on public.attendance_sessions for select to authenticated
  using (
    (
      started_by = auth.uid()
      and public.current_app_role() = 'FACULTY'
    )
    or public.student_can_access_attendance_session(id, auth.uid())
  );

drop policy if exists attendance_sessions_insert_faculty on public.attendance_sessions;
create policy attendance_sessions_insert_faculty
  on public.attendance_sessions for insert to authenticated
  with check (
    started_by = auth.uid()
    and public.current_app_role() = 'FACULTY'
    and public.faculty_owns_class(class_offering_id, auth.uid())
  );

drop policy if exists attendance_sessions_update_owner on public.attendance_sessions;
create policy attendance_sessions_update_owner
  on public.attendance_sessions for update to authenticated
  using (
    public.faculty_owns_attendance_session(id, auth.uid())
    and public.current_app_role() = 'FACULTY'
  )
  with check (
    started_by = auth.uid()
    and public.current_app_role() = 'FACULTY'
    and public.faculty_owns_class(class_offering_id, auth.uid())
  );

drop policy if exists attendance_challenges_select_scoped on public.attendance_challenges;
create policy attendance_challenges_select_scoped
  on public.attendance_challenges for select to authenticated
  using (
    public.faculty_owns_attendance_session(attendance_session_id, auth.uid())
  );

drop policy if exists attendance_records_select_scoped on public.attendance_records;
create policy attendance_records_select_scoped
  on public.attendance_records for select to authenticated
  using (
    student_id = auth.uid()
    or public.faculty_owns_attendance_session(attendance_session_id, auth.uid())
  );

drop policy if exists attendance_records_insert_self on public.attendance_records;
create policy attendance_records_insert_self
  on public.attendance_records for insert to authenticated
  with check (
    student_id = auth.uid()
    and public.current_app_role() = 'STUDENT'
    and public.student_can_access_attendance_session(attendance_session_id, auth.uid())
  );