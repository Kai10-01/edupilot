-- =====================================================================
-- EduPilot database (Supabase / PostgreSQL)
-- HOW TO USE: Supabase dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run. Then do the same with seed.sql.
-- WARNING: running this again deletes all EduPilot data and starts fresh.
-- =====================================================================

drop table if exists public.payment_events cascade;
drop table if exists public.payments cascade;
drop table if exists public.obligations cascade;
drop table if exists public.semester_plans cascade;
drop table if exists public.students cascade;
drop table if exists public.profiles cascade;
drop table if exists public.universities cascade;

-- ---------- tables ----------
create table public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  verified boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null check (role in ('parent', 'student', 'university')),
  university_id uuid references public.universities(id) on delete set null,
  home_currency text not null default 'CNY',
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  student_number text not null unique,
  programme text,
  university_id uuid not null references public.universities(id) on delete cascade,
  sponsor_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.semester_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  semester_label text not null,
  plan_fee_paid boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.obligations (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.semester_plans(id) on delete cascade,
  type text not null check (type in ('tuition', 'accommodation', 'allowance')),
  label text not null,
  amount_myr numeric(12, 2) not null check (amount_myr > 0),
  due_date date not null,
  invoice_no text not null,
  payee_name text not null,
  payee_verified boolean not null default true,
  status text not null default 'planned' check (status in ('planned', 'scheduled', 'processing', 'completed')),
  scheduled_for date,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null unique references public.obligations(id) on delete cascade, -- one payment per item
  student_id uuid not null references public.students(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete cascade,
  payer_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('tuition', 'accommodation', 'allowance')),
  reference text not null unique,
  method text not null check (method in ('bank', 'card', 'ewallet')),
  amount_myr numeric(12, 2) not null,
  plan_fee numeric(12, 2) not null default 0,
  provider_fee numeric(12, 2) not null default 0,
  fx_rate numeric(14, 6) not null,
  payer_currency text not null,
  total_myr numeric(12, 2) not null,
  total_foreign numeric(16, 2) not null,
  status text not null default 'initiated' check (status in ('initiated', 'processing', 'received', 'confirmed')),
  status_checks integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  kind text not null,
  status text not null check (status in ('initiated', 'processing', 'received', 'confirmed')),
  note text,
  created_at timestamptz not null default clock_timestamp()
);

create index on public.students (sponsor_profile_id);
create index on public.students (university_id);
create index on public.semester_plans (student_id);
create index on public.obligations (plan_id);
create index on public.payments (student_id);
create index on public.payment_events (payment_id);
create index on public.payment_events (student_id);

-- ---------- who can see what (Row Level Security) ----------
-- Student and sponsor see their own plan. University staff see their own
-- students' tuition and accommodation, but never living allowances.
create or replace function public.can_see_item(p_student_id uuid, p_kind text default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from students s
    where s.id = p_student_id
      and (
        s.profile_id = auth.uid()
        or s.sponsor_profile_id = auth.uid()
        or (
          coalesce(p_kind, '') <> 'allowance'
          and exists (select 1 from profiles p
                      where p.id = auth.uid() and p.role = 'university' and p.university_id = s.university_id)
        )
      )
  );
$$;

alter table public.universities enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.semester_plans enable row level security;
alter table public.obligations enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

-- Read-only policies. All changes go through the functions below,
-- so nobody can edit amounts or statuses directly.
create policy "universities readable" on public.universities for select to authenticated using (true);
create policy "own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "linked students" on public.students for select to authenticated using (public.can_see_item(id));
create policy "linked plans" on public.semester_plans for select to authenticated using (public.can_see_item(student_id));
create policy "linked obligations" on public.obligations for select to authenticated using (
  exists (select 1 from public.semester_plans sp where sp.id = plan_id and public.can_see_item(sp.student_id, type))
);
create policy "linked payments" on public.payments for select to authenticated using (public.can_see_item(student_id, kind));
create policy "linked events" on public.payment_events for select to authenticated using (public.can_see_item(student_id, kind));

-- ---------- fees (SAMPLE values – keep in sync with src/lib/rules.js) ----------
create or replace function public.provider_fee_rate(p_method text) returns numeric
language sql immutable as $$
  select case p_method when 'bank' then 0.005 when 'card' then 0.015 when 'ewallet' then 0.008 end;
$$;

create or replace function public.sample_fx_rate(p_currency text) returns numeric
language sql immutable as $$
  select case p_currency when 'CNY' then 1.65 when 'IDR' then 3720 when 'INR' then 19.8
                         when 'USD' then 0.23 when 'GBP' then 0.18 else 1.65 end;
$$;

create or replace function public.event_note(p_status text, p_kind text, p_invoice text, p_student_number text)
returns text language sql immutable as $$
  select case p_status
    when 'initiated' then 'Payment instruction created by sponsor'
    when 'processing' then 'Sent to licensed payment provider (demo)'
    when 'received' then case when p_kind = 'allowance' then 'Released to student account'
                              else 'Funds received by university finance office' end
    when 'confirmed' then case when p_kind = 'allowance' then 'Student confirmed the allowance arrived'
                               else 'Matched to invoice ' || p_invoice || ' and student ' || p_student_number end
  end;
$$;

-- ---------- actions ----------
-- Parent pays an item. Fees are calculated here on the server, so the
-- browser cannot change them. No real money moves (simulated provider).
create or replace function public.make_payment(p_obligation_id uuid, p_method text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_prof profiles; v_ob obligations; v_plan semester_plans; v_student students;
  v_plan_fee numeric := 0; v_fee numeric; v_fx numeric; v_total numeric; v_id uuid;
begin
  select * into v_prof from profiles where id = auth.uid();
  if v_prof.id is null or v_prof.role <> 'parent' then
    raise exception 'Only the family sponsor can make payments.';
  end if;
  select * into v_ob from obligations where id = p_obligation_id for update;
  if v_ob.id is null then raise exception 'Payment item not found.'; end if;
  select * into v_plan from semester_plans where id = v_ob.plan_id for update;
  select * into v_student from students where id = v_plan.student_id;
  if v_student.sponsor_profile_id is distinct from auth.uid() then
    raise exception 'You are not the sponsor for this student.';
  end if;
  if v_ob.status not in ('planned', 'scheduled') then
    raise exception 'This item is already paid or in progress.';
  end if;
  if p_method not in ('bank', 'card', 'ewallet') then raise exception 'Unknown payment method.'; end if;

  if not v_plan.plan_fee_paid then
    v_plan_fee := 129; -- RM129 Semester Plan fee, charged once per semester
    update semester_plans set plan_fee_paid = true where id = v_plan.id;
  end if;
  v_fee := round(v_ob.amount_myr * provider_fee_rate(p_method), 2);
  v_fx := sample_fx_rate(v_prof.home_currency);
  v_total := v_ob.amount_myr + v_plan_fee + v_fee;

  insert into payments (obligation_id, student_id, university_id, payer_id, kind, reference, method,
                        amount_myr, plan_fee, provider_fee, fx_rate, payer_currency, total_myr, total_foreign, status)
  values (v_ob.id, v_student.id, v_student.university_id, auth.uid(), v_ob.type,
          'EP-' || v_student.student_number || '-' || upper(substr(md5(random()::text), 1, 6)), p_method,
          v_ob.amount_myr, v_plan_fee, v_fee, v_fx, v_prof.home_currency, v_total, round(v_total * v_fx, 2), 'processing')
  returning id into v_id;

  insert into payment_events (payment_id, student_id, kind, status, note)
  values (v_id, v_student.id, v_ob.type, 'initiated', event_note('initiated', v_ob.type, v_ob.invoice_no, v_student.student_number));
  insert into payment_events (payment_id, student_id, kind, status, note)
  values (v_id, v_student.id, v_ob.type, 'processing', event_note('processing', v_ob.type, v_ob.invoice_no, v_student.student_number));

  update obligations set status = 'processing' where id = v_ob.id;
  return v_id;
end;
$$;

-- University marks tuition/accommodation received -> confirmed.
-- The student confirms their own allowance releases.
create or replace function public.advance_payment(p_payment_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_prof profiles; v_pay payments; v_ob obligations; v_student students;
begin
  select * into v_prof from profiles where id = auth.uid();
  select * into v_pay from payments where id = p_payment_id for update;
  if v_pay.id is null then raise exception 'Payment not found.'; end if;
  select * into v_ob from obligations where id = v_pay.obligation_id;
  select * into v_student from students where id = v_pay.student_id;

  if v_ob.type = 'allowance' then
    if v_student.profile_id is distinct from auth.uid() then
      raise exception 'Only the student can confirm an allowance release.';
    end if;
  elsif v_prof.role is distinct from 'university' or v_prof.university_id is distinct from v_pay.university_id then
    raise exception 'Only the university finance office can update this payment.';
  end if;

  if not ((v_pay.status = 'processing' and p_status = 'received') or (v_pay.status = 'received' and p_status = 'confirmed')) then
    raise exception 'This status change is not allowed.';
  end if;

  update payments set status = p_status, updated_at = now() where id = v_pay.id;
  insert into payment_events (payment_id, student_id, kind, status, note)
  values (v_pay.id, v_pay.student_id, v_pay.kind, p_status, event_note(p_status, v_ob.type, v_ob.invoice_no, v_student.student_number));
  if p_status = 'confirmed' then
    update obligations set status = 'completed' where id = v_ob.id;
  end if;
end;
$$;

-- Parent sets (or clears) the planned payment / release date of an item.
create or replace function public.schedule_payment(p_obligation_id uuid, p_date date)
returns void language plpgsql security definer set search_path = public as $$
declare v_ob obligations; v_sponsor uuid;
begin
  select o.* into v_ob from obligations o where o.id = p_obligation_id for update;
  select s.sponsor_profile_id into v_sponsor
    from semester_plans sp join students s on s.id = sp.student_id where sp.id = v_ob.plan_id;
  if v_ob.id is null or v_sponsor is distinct from auth.uid() then
    raise exception 'Only the sponsor can schedule this item.';
  end if;
  if v_ob.status not in ('planned', 'scheduled') then
    raise exception 'This item is already paid or in progress.';
  end if;
  update obligations
     set scheduled_for = p_date, status = case when p_date is null then 'planned' else 'scheduled' end
   where id = v_ob.id;
end;
$$;

-- Counts a family checking status in the app instead of emailing the
-- university ("Has my payment arrived?" enquiries avoided).
create or replace function public.log_status_check(p_payment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_pay payments;
begin
  select * into v_pay from payments where id = p_payment_id;
  if v_pay.id is null or not can_see_item(v_pay.student_id, v_pay.kind) then return; end if;
  if exists (select 1 from profiles where id = auth.uid() and role = 'university') then return; end if;
  update payments set status_checks = status_checks + 1 where id = p_payment_id;
end;
$$;

revoke execute on function public.make_payment(uuid, text) from public, anon;
revoke execute on function public.advance_payment(uuid, text) from public, anon;
revoke execute on function public.schedule_payment(uuid, date) from public, anon;
revoke execute on function public.log_status_check(uuid) from public, anon;
grant execute on function public.make_payment(uuid, text) to authenticated;
grant execute on function public.advance_payment(uuid, text) to authenticated;
grant execute on function public.schedule_payment(uuid, date) to authenticated;
grant execute on function public.log_status_check(uuid) to authenticated;

-- ---------- new sign-ups ----------
-- Gives every new parent/student a sample Semester Plan to try.
create or replace function public.create_sandbox_plan(p_student_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_s students; v_uni text; v_plan uuid; v_n text; i int;
begin
  select * into v_s from students where id = p_student_id;
  select name into v_uni from universities where id = v_s.university_id;
  v_n := right(v_s.student_number, 4);
  insert into semester_plans (student_id, semester_label) values (v_s.id, 'September 2026 Semester') returning id into v_plan;
  insert into obligations (plan_id, type, label, amount_myr, due_date, invoice_no, payee_name) values
    (v_plan, 'tuition', 'Tuition fee', 18000, current_date + 21, 'INV-2026-' || v_n, v_uni),
    (v_plan, 'accommodation', 'Accommodation fee', 6000, current_date + 10, 'ACC-2026-' || v_n, v_uni || ' – On-Campus Residence');
  for i in 1..4 loop
    insert into obligations (plan_id, type, label, amount_myr, due_date, invoice_no, payee_name)
    values (v_plan, 'allowance', 'Living allowance', 1000, current_date + 5 + (i - 1) * 30,
            'ALW-' || v_s.student_number || '-' || i, v_s.full_name || ' (student account)');
  end loop;
end;
$$;
revoke execute on function public.create_sandbox_plan(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role text := coalesce(v_meta ->> 'role', 'parent');
  v_name text := coalesce(nullif(v_meta ->> 'full_name', ''), split_part(new.email, '@', 1));
  v_cur text := coalesce(v_meta ->> 'home_currency', 'CNY');
  v_uni uuid; v_student uuid; v_num text;
begin
  if v_cur not in ('CNY', 'IDR', 'INR', 'USD', 'GBP') then v_cur := 'CNY'; end if;

  -- Accounts created by seed.sql (server-side only) keep their role, incl. university.
  if coalesce(new.raw_app_meta_data ->> 'seed', '') = 'true' then
    insert into profiles (id, full_name, role, university_id, home_currency)
    values (new.id, v_name, v_role, nullif(v_meta ->> 'university_id', '')::uuid, v_cur);
    return new;
  end if;

  -- Public sign-ups can only be parents or students.
  if v_role not in ('parent', 'student') then v_role := 'parent'; end if;
  insert into profiles (id, full_name, role, home_currency) values (new.id, v_name, v_role, v_cur);

  select id into v_uni from universities order by created_at limit 1;
  if v_uni is null then return new; end if;
  loop
    v_num := 'S' || lpad(floor(random() * 10000000)::int::text, 7, '0');
    exit when not exists (select 1 from students where student_number = v_num);
  end loop;
  insert into students (profile_id, full_name, student_number, programme, university_id, sponsor_profile_id)
  values (
    case when v_role = 'student' then new.id end,
    case when v_role = 'student' then v_name else coalesce(nullif(v_meta ->> 'student_name', ''), 'Your student (sandbox)') end,
    v_num, 'Sandbox programme', v_uni,
    case when v_role = 'parent' then new.id end
  ) returning id into v_student;
  perform create_sandbox_plan(v_student);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- live updates (Supabase Realtime) ----------
do $$
declare t text;
begin
  foreach t in array array['payments', 'payment_events', 'obligations', 'semester_plans'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
