create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('STUDENT', 'FACULTY');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.user_accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique check (length(trim(email)) >= 3),
  role public.app_role not null default 'STUDENT',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.student_profiles (
  user_id uuid primary key references public.user_accounts (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) >= 2),
  roll_number text not null unique check (length(trim(roll_number)) >= 2),
  department text,
  semester smallint check (semester is null or semester between 1 and 12),
  section text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.faculty_profiles (
  user_id uuid primary key references public.user_accounts (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) >= 2),
  employee_number text unique,
  department text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(trim(code)) >= 2),
  name text not null check (length(trim(name)) >= 2),
  credits smallint check (credits is null or credits between 1 and 10),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.room_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) >= 2),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  radius_meters integer not null default 25 check (radius_meters between 5 and 500),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.class_offerings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete restrict,
  faculty_id uuid not null references public.faculty_profiles (user_id) on delete restrict,
  section text not null check (length(trim(section)) >= 1),
  room_location_id uuid references public.room_locations (id) on delete restrict,
  academic_year text not null check (length(trim(academic_year)) >= 4),
  term text not null check (length(trim(term)) >= 1),
  created_at timestamptz not null default timezone('utc', now()),
  unique (course_id, faculty_id, section, academic_year, term)
);

create table if not exists public.enrollments (
  student_id uuid not null references public.student_profiles (user_id) on delete cascade,
  class_offering_id uuid not null references public.class_offerings (id) on delete cascade,
  enrolled_at timestamptz not null default timezone('utc', now()),
  primary key (student_id, class_offering_id)
);

create or replace function public.prevent_profile_identity_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.user_id <> new.user_id then
    raise exception 'Profile ownership cannot be changed';
  end if;

  if tg_table_name = 'student_profiles'
     and to_jsonb(old) ->> 'roll_number' <> to_jsonb(new) ->> 'roll_number' then
    raise exception 'Student roll number cannot be changed through the profile';
  end if;

  return new;
end;
$$;

drop trigger if exists student_profile_identity_guard on public.student_profiles;
create trigger student_profile_identity_guard
  before update on public.student_profiles
  for each row execute function public.prevent_profile_identity_change();

drop trigger if exists faculty_profile_identity_guard on public.faculty_profiles;
create trigger faculty_profile_identity_guard
  before update on public.faculty_profiles
  for each row execute function public.prevent_profile_identity_change();

create index if not exists class_offerings_faculty_id_idx
  on public.class_offerings (faculty_id);
create index if not exists class_offerings_course_id_idx
  on public.class_offerings (course_id);
create index if not exists enrollments_class_offering_id_idx
  on public.enrollments (class_offering_id);

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_accounts where id = auth.uid();
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

create or replace function public.is_enrolled_in_class(
  offering_id uuid,
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
    from public.enrollments
    where class_offering_id = offering_id
      and student_id = student_user_id
      and student_user_id = auth.uid()
  );
$$;

create or replace function public.faculty_owns_class(
  offering_id uuid,
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
    from public.class_offerings
    where id = offering_id
      and faculty_id = faculty_user_id
      and faculty_user_id = auth.uid()
  );
$$;

revoke all on function public.is_enrolled_in_class(uuid, uuid) from public;
grant execute on function public.is_enrolled_in_class(uuid, uuid) to authenticated;
revoke all on function public.faculty_owns_class(uuid, uuid) from public;
grant execute on function public.faculty_owns_class(uuid, uuid) to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_accounts (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update
    set email = excluded.email,
        updated_at = timezone('utc', now());

  -- Public registration can only create STUDENT accounts. Faculty accounts
  -- must be provisioned separately and then assigned the FACULTY role.
  if upper(coalesce(new.raw_user_meta_data ->> 'account_type', '')) = 'STUDENT' then
    insert into public.student_profiles (user_id, full_name, roll_number)
    values (
      new.id,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Student'),
      nullif(trim(new.raw_user_meta_data ->> 'roll_number'), '')
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.sync_auth_user_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_accounts
  set email = coalesce(new.email, ''),
      updated_at = timezone('utc', now())
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.sync_auth_user_email();

alter table public.user_accounts enable row level security;
alter table public.student_profiles enable row level security;
alter table public.faculty_profiles enable row level security;
alter table public.courses enable row level security;
alter table public.room_locations enable row level security;
alter table public.class_offerings enable row level security;
alter table public.enrollments enable row level security;

revoke all on table
  public.user_accounts,
  public.student_profiles,
  public.faculty_profiles,
  public.courses,
  public.room_locations,
  public.class_offerings,
  public.enrollments
from public;

grant usage on schema public to authenticated;
grant select on public.user_accounts to authenticated;
grant select, update on public.student_profiles to authenticated;
grant select, update on public.faculty_profiles to authenticated;
grant select, insert, update on public.courses to authenticated;
grant select, insert, update on public.room_locations to authenticated;
grant select, insert, update, delete on public.class_offerings to authenticated;
grant select, insert, delete on public.enrollments to authenticated;

grant all on public.user_accounts to service_role;
grant all on public.student_profiles to service_role;
grant all on public.faculty_profiles to service_role;
grant all on public.courses to service_role;
grant all on public.room_locations to service_role;
grant all on public.class_offerings to service_role;
grant all on public.enrollments to service_role;

drop policy if exists user_accounts_select_own on public.user_accounts;
create policy user_accounts_select_own
  on public.user_accounts for select to authenticated
  using (id = auth.uid());

drop policy if exists student_profiles_select_own on public.student_profiles;
create policy student_profiles_select_own
  on public.student_profiles for select to authenticated
  using (user_id = auth.uid());

drop policy if exists student_profiles_update_own on public.student_profiles;
create policy student_profiles_update_own
  on public.student_profiles for update to authenticated
  using (user_id = auth.uid() and public.current_app_role() = 'STUDENT')
  with check (user_id = auth.uid() and public.current_app_role() = 'STUDENT');

drop policy if exists faculty_profiles_select_own on public.faculty_profiles;
create policy faculty_profiles_select_own
  on public.faculty_profiles for select to authenticated
  using (user_id = auth.uid());

drop policy if exists faculty_profiles_update_own on public.faculty_profiles;
create policy faculty_profiles_update_own
  on public.faculty_profiles for update to authenticated
  using (user_id = auth.uid() and public.current_app_role() = 'FACULTY')
  with check (user_id = auth.uid() and public.current_app_role() = 'FACULTY');

drop policy if exists courses_select_authenticated on public.courses;
create policy courses_select_authenticated
  on public.courses for select to authenticated
  using (true);

drop policy if exists courses_insert_faculty on public.courses;
create policy courses_insert_faculty
  on public.courses for insert to authenticated
  with check (public.current_app_role() = 'FACULTY');

drop policy if exists courses_update_faculty on public.courses;
create policy courses_update_faculty
  on public.courses for update to authenticated
  using (public.current_app_role() = 'FACULTY')
  with check (public.current_app_role() = 'FACULTY');

drop policy if exists room_locations_select_authenticated on public.room_locations;
create policy room_locations_select_authenticated
  on public.room_locations for select to authenticated
  using (true);

drop policy if exists room_locations_insert_faculty on public.room_locations;
create policy room_locations_insert_faculty
  on public.room_locations for insert to authenticated
  with check (public.current_app_role() = 'FACULTY');

drop policy if exists room_locations_update_faculty on public.room_locations;
create policy room_locations_update_faculty
  on public.room_locations for update to authenticated
  using (public.current_app_role() = 'FACULTY')
  with check (public.current_app_role() = 'FACULTY');

drop policy if exists class_offerings_select_scoped on public.class_offerings;
create policy class_offerings_select_scoped
  on public.class_offerings for select to authenticated
  using (
    faculty_id = auth.uid()
    or public.is_enrolled_in_class(id, auth.uid())
  );

drop policy if exists class_offerings_insert_owner on public.class_offerings;
create policy class_offerings_insert_owner
  on public.class_offerings for insert to authenticated
  with check (
    faculty_id = auth.uid()
    and public.current_app_role() = 'FACULTY'
  );

drop policy if exists class_offerings_update_owner on public.class_offerings;
create policy class_offerings_update_owner
  on public.class_offerings for update to authenticated
  using (faculty_id = auth.uid() and public.current_app_role() = 'FACULTY')
  with check (faculty_id = auth.uid() and public.current_app_role() = 'FACULTY');

drop policy if exists class_offerings_delete_owner on public.class_offerings;
create policy class_offerings_delete_owner
  on public.class_offerings for delete to authenticated
  using (faculty_id = auth.uid() and public.current_app_role() = 'FACULTY');

drop policy if exists enrollments_select_scoped on public.enrollments;
create policy enrollments_select_scoped
  on public.enrollments for select to authenticated
  using (
    student_id = auth.uid()
    or public.faculty_owns_class(class_offering_id, auth.uid())
  );

drop policy if exists enrollments_insert_self on public.enrollments;
create policy enrollments_insert_self
  on public.enrollments for insert to authenticated
  with check (
    student_id = auth.uid()
    and public.current_app_role() = 'STUDENT'
  );

drop policy if exists enrollments_delete_self on public.enrollments;
create policy enrollments_delete_self
  on public.enrollments for delete to authenticated
  using (student_id = auth.uid() and public.current_app_role() = 'STUDENT');