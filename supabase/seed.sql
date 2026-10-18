-- =====================================================================
-- EduPilot demo data. Run AFTER schema.sql (SQL Editor -> paste -> Run).
-- Safe to run again any time: it resets the demo to a clean starting point.
--
-- Demo logins (password for all three: EduPilot2026!)
--   parent@example.com      – Mr. Tan Wei Ming (sponsor)
--   student@example.com     – Emily Tan, S1234567
--   university@example.com  – Nurul Aisyah, finance office
-- =====================================================================

-- helper: create a confirmed email/password user
create or replace function public._seed_user(p_id uuid, p_email text, p_meta jsonb)
returns void language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change, email_change_token_new,
                          email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
          extensions.crypt('EduPilot2026!', extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"],"seed":true}'::jsonb, p_meta, now(), now(),
          '', '', '', '', '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text,
          jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
end;
$$;

-- helper: a historic payment with a believable timeline
create or replace function public._seed_payment(p_ob uuid, p_payer uuid, p_method text, p_currency text,
                                                p_status text, p_created timestamptz, p_checks int)
returns void language plpgsql as $$
declare
  v_ob obligations; v_plan semester_plans; v_s students;
  v_plan_fee numeric := 0; v_fee numeric; v_fx numeric; v_total numeric; v_id uuid;
  v_span interval := now() - p_created;
  v_steps text[] := array['initiated', 'processing', 'received', 'confirmed'];
  v_times timestamptz[] := array[p_created, p_created + interval '1 minute', p_created + v_span * 0.5, p_created + v_span * 0.75];
  i int;
begin
  select * into v_ob from obligations where id = p_ob;
  select * into v_plan from semester_plans where id = v_ob.plan_id;
  select * into v_s from students where id = v_plan.student_id;
  if not v_plan.plan_fee_paid then
    v_plan_fee := 129;
    update semester_plans set plan_fee_paid = true where id = v_plan.id;
  end if;
  v_fee := round(v_ob.amount_myr * provider_fee_rate(p_method), 2);
  v_fx := sample_fx_rate(p_currency);
  v_total := v_ob.amount_myr + v_plan_fee + v_fee;
  insert into payments (obligation_id, student_id, university_id, payer_id, kind, reference, method, amount_myr, plan_fee,
                        provider_fee, fx_rate, payer_currency, total_myr, total_foreign, status, status_checks, created_at, updated_at)
  values (v_ob.id, v_s.id, v_s.university_id, p_payer, v_ob.type,
          'EP-' || v_s.student_number || '-' || upper(substr(md5(random()::text), 1, 6)), p_method, v_ob.amount_myr, v_plan_fee,
          v_fee, v_fx, p_currency, v_total, round(v_total * v_fx, 2), p_status, p_checks, p_created,
          v_times[array_position(v_steps, p_status)])
  returning id into v_id;
  for i in 1..array_position(v_steps, p_status) loop
    insert into payment_events (payment_id, student_id, kind, status, note, created_at)
    values (v_id, v_s.id, v_ob.type, v_steps[i], event_note(v_steps[i], v_ob.type, v_ob.invoice_no, v_s.student_number), v_times[i]);
  end loop;
  update obligations set status = case when p_status = 'confirmed' then 'completed' else 'processing' end where id = v_ob.id;
end;
$$;

do $$
declare
  v_uni uuid := '0e000000-0000-4000-8000-000000000001';
  v_parent uuid := '0e000000-0000-4000-8000-0000000000a1';
  v_student uuid := '0e000000-0000-4000-8000-0000000000a2';
  v_staff uuid := '0e000000-0000-4000-8000-0000000000a3';
  v_emily uuid; v_plan uuid; v_tuition uuid; v_allow1 uuid;
  v_s uuid; v_ob uuid;
  r record;
  i int := 0;
begin
  -- 1. wipe the previous demo
  delete from auth.users where email in ('parent@example.com', 'student@example.com', 'university@example.com');
  delete from public.universities where id = v_uni;

  -- 2. university + demo users
  insert into public.universities (id, name, verified, created_at) values (v_uni, 'Sunway University', true, now() - interval '400 days');
  perform public._seed_user(v_parent, 'parent@example.com', '{"full_name":"Mr. Tan Wei Ming","role":"parent","home_currency":"CNY"}');
  perform public._seed_user(v_student, 'student@example.com', '{"full_name":"Emily Tan","role":"student"}');
  perform public._seed_user(v_staff, 'university@example.com',
    jsonb_build_object('full_name', 'Nurul Aisyah', 'role', 'university', 'university_id', v_uni));

  -- 3. Emily's Semester Plan
  insert into public.students (profile_id, full_name, student_number, programme, university_id, sponsor_profile_id)
  values (v_student, 'Emily Tan', 'S1234567', 'BSc (Hons) Business Analytics', v_uni, v_parent) returning id into v_emily;
  insert into public.semester_plans (student_id, semester_label, created_at)
  values (v_emily, 'September 2026 Semester', now() - interval '70 days') returning id into v_plan;

  insert into public.obligations (plan_id, type, label, amount_myr, due_date, invoice_no, payee_name)
  values (v_plan, 'tuition', 'Tuition fee', 18000, current_date - 55, 'INV-2026-10452', 'Sunway University') returning id into v_tuition;
  insert into public.obligations (plan_id, type, label, amount_myr, due_date, invoice_no, payee_name, status, scheduled_for)
  values (v_plan, 'accommodation', 'Accommodation fee', 6000, current_date + 12, 'ACC-2026-0381',
          'Sunway University – On-Campus Residence', 'scheduled', current_date + 10);
  insert into public.obligations (plan_id, type, label, amount_myr, due_date, invoice_no, payee_name)
  values (v_plan, 'allowance', 'Living allowance', 1000, current_date - 17, 'ALW-S1234567-1', 'Emily Tan (student account)')
  returning id into v_allow1;
  insert into public.obligations (plan_id, type, label, amount_myr, due_date, invoice_no, payee_name, status, scheduled_for)
  values (v_plan, 'allowance', 'Living allowance', 1000, current_date + 13, 'ALW-S1234567-2', 'Emily Tan (student account)', 'scheduled', current_date + 13);
  insert into public.obligations (plan_id, type, label, amount_myr, due_date, invoice_no, payee_name) values
    (v_plan, 'allowance', 'Living allowance', 1000, current_date + 43, 'ALW-S1234567-3', 'Emily Tan (student account)'),
    (v_plan, 'allowance', 'Living allowance', 1000, current_date + 73, 'ALW-S1234567-4', 'Emily Tan (student account)');

  perform public._seed_payment(v_tuition, v_parent, 'bank', 'CNY', 'confirmed', date_trunc('day', now()) - interval '58 days' + interval '9 hours 12 minutes', 4);
  perform public._seed_payment(v_allow1, v_parent, 'ewallet', 'CNY', 'confirmed', date_trunc('day', now()) - interval '18 days' + interval '20 hours 12 minutes', 1);

  -- 4. other students so the university dashboard looks realistic
  for r in select * from (values
      ('Ali Khan', 'S2345678', 'tuition', 18000, 'confirmed', 6, 'IDR', 3),
      ('Siti Rahman', 'S3456789', 'tuition', 18000, 'received', 1, 'IDR', 2),
      ('Chen Wei', 'S4567890', 'accommodation', 6000, 'processing', 0, 'CNY', 1),
      ('Maria Santos', 'S5678901', 'accommodation', 6000, 'confirmed', 9, 'USD', 5),
      ('Priya Nair', 'S6789012', 'tuition', 21500, 'processing', 1, 'INR', 2),
      ('Ahmed Hassan', 'S7890123', 'tuition', 18000, 'received', 2, 'GBP', 3)
    ) as t(name, num, kind, amount, status, days_ago, cur, checks)
  loop
    insert into public.students (full_name, student_number, university_id) values (r.name, r.num, v_uni) returning id into v_s;
    insert into public.semester_plans (student_id, semester_label, created_at)
    values (v_s, 'September 2026 Semester', now() - interval '70 days') returning id into v_plan;
    insert into public.obligations (plan_id, type, label, amount_myr, due_date, invoice_no, payee_name)
    values (v_plan, r.kind, case when r.kind = 'tuition' then 'Tuition fee' else 'Accommodation fee' end, r.amount,
            current_date + 14 - r.days_ago,
            case when r.kind = 'tuition' then 'INV' else 'ACC' end || '-2026-' || (10460 + i),
            case when r.kind = 'tuition' then 'Sunway University' else 'Sunway University – On-Campus Residence' end)
    returning id into v_ob;
    perform public._seed_payment(v_ob, null, 'bank', r.cur, r.status,
      case when r.days_ago = 0 then now() - interval '40 minutes'
           else date_trunc('day', now()) - make_interval(days => r.days_ago) + interval '11 hours' end,
      r.checks);
    i := i + 1;
  end loop;
end $$;

drop function public._seed_user(uuid, text, jsonb);
drop function public._seed_payment(uuid, uuid, text, text, text, timestamptz, int);

select 'Demo data ready. Log in with parent@example.com / EduPilot2026!' as result;
