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
