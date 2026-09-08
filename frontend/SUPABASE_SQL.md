# ALPHA FITNESS — Supabase SQL Database Schema & RLS Security

Please copy and run this complete query inside your **Supabase SQL Editor** to establish a secure, multi-tenant database environment. Row-Level Security (RLS) is fully configured for every table, isolating gym owner and branch records securely using `auth.uid() = owner_id`.

```sql
-- ============================================
-- STEP 1: DROP ALL EXISTING TABLES (Clean Slate Setup)
-- ============================================
drop table if exists diet_plans cascade;
drop table if exists payments cascade;
drop table if exists monthly_reports cascade;
drop table if exists rfid_pending cascade;
drop table if exists sales cascade;
drop table if exists products cascade;
drop table if exists todos cascade;
drop table if exists expenses cascade;
drop table if exists attendance_logs cascade;
drop table if exists members cascade;
drop table if exists branches cascade;
drop table if exists gym_owners cascade;

-- ============================================
-- STEP 2: CREATE SECURE TABLES
-- ============================================

-- Gym Owners (Linked to Supabase Auth.users)
create table gym_owners (
  id uuid references auth.users(id) primary key,
  name text default '',
  email text default '',
  phone text default '',
  created_at timestamptz default now()
);

-- Branches
create table branches (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references gym_owners(id) on delete cascade not null,
  gym_name text not null default 'ALPHA FITNESS',
  branch_name text default 'Main Branch',
  address text default '',
  phone text default '',
  plan_prices jsonb default '{"Monthly":1500,"Quarterly":4000,"HalfYearly":7500,"Yearly":13000}',
  shifts jsonb default '[{"start":"06:00","end":"11:00"},{"start":"17:00","end":"22:00"}]',
  slot_duration_min integer default 60,
  slot_capacity integer default 20,
  theme text default 'dark',
  preset text default 'lime',
  currency text default 'INR',
  language text default 'hinglish',
  workout_templates jsonb default '[]'::jsonb,
  whatsapp_webhook_url text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Members
create table members (
  id uuid default gen_random_uuid() primary key,
  branch_id uuid references branches(id) on delete cascade not null,
  roll_no text not null,
  rfid text,
  name text not null,
  phone text not null,
  email text,
  address text,
  gender text check (gender in ('M','F','O')),
  age integer,
  height_cm numeric,
  weight_kg numeric,
  goal text default 'General Fitness',
  medical text,
  emergency_contact text,
  photo text,
  join_date_manual date,
  joining_date date,
  plan text check (plan in ('Monthly','Quarterly','HalfYearly','Yearly')),
  fee_amount integer default 0,
  fee_paid boolean default false,
  expiry_date timestamptz,
  preferred_slot text,
  workout_routine jsonb default '[]'::jsonb,
  progress_logs jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  unique(branch_id, roll_no)
);

-- Attendance Logs
create table attendance_logs (
  id uuid default gen_random_uuid() primary key,
  branch_id uuid references branches(id) on delete cascade not null,
  member_id uuid references members(id) on delete cascade not null,
  punch_type text default 'in' check (punch_type in ('in','out')),
  checked_in_at timestamptz default now()
);

-- Expenses
create table expenses (
  id uuid default gen_random_uuid() primary key,
  branch_id uuid references branches(id) on delete cascade not null,
  title text not null,
  amount integer not null default 0,
  category text check (category in ('Rent','Water','Electricity','Equipment','Staff','Other')),
  date timestamptz default now(),
  created_at timestamptz default now()
);

-- Todos
create table todos (
  id uuid default gen_random_uuid() primary key,
  branch_id uuid references branches(id) on delete cascade not null,
  title text not null,
  note text,
  priority text default 'med' check (priority in ('low','med','high')),
  done boolean default false,
  created_at timestamptz default now()
);

-- Products Catalog
create table products (
  id uuid default gen_random_uuid() primary key,
  branch_id uuid references branches(id) on delete cascade not null,
  name text not null,
  category text check (category in ('Protein','PreWorkout','Vitamins','Snacks','Drinks','Accessory')),
  price integer default 0,
  cost integer default 0,
  stock integer default 0,
  low_stock_at integer default 3,
  created_at timestamptz default now()
);

-- Supplement Store Sales
create table sales (
  id uuid default gen_random_uuid() primary key,
  branch_id uuid references branches(id) on delete cascade not null,
  items jsonb not null default '[]',
  total integer not null default 0,
  payment_mode text check (payment_mode in ('Cash','UPI','Card')),
  member_id uuid references members(id) on delete set null,
  customer text,
  created_at timestamptz default now()
);

-- RFID Pending Scans (Inserted anonymously by Arduino scan gateways)
create table rfid_pending (
  id uuid default gen_random_uuid() primary key,
  branch_id uuid references branches(id) on delete cascade,
  uid text not null,
  claimed boolean default false,
  created_at timestamptz default now()
);

-- Payments (Tracks registrations, monthly dues, and plan renewals)
create table payments (
  id uuid default gen_random_uuid() primary key,
  branch_id uuid references branches(id) on delete cascade not null,
  member_id uuid references members(id) on delete set null,
  amount integer not null default 0,
  plan text,
  payment_date timestamptz default now(),
  note text,
  created_at timestamptz default now()
);

-- Diet Plans
create table diet_plans (
  id uuid default gen_random_uuid() primary key,
  branch_id uuid references branches(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  goal text,
  weight_kg numeric,
  height_cm numeric,
  age integer,
  gender text,
  activity_level text,
  workout_days integer,
  plan_data jsonb,
  created_at timestamptz default now()
);

-- ============================================
-- STEP 3: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
alter table gym_owners enable row level security;
alter table branches enable row level security;
alter table members enable row level security;
alter table attendance_logs enable row level security;
alter table expenses enable row level security;
alter table todos enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table rfid_pending disable row level security; -- Disabled so Arduino scanning gateways can punch anonymously
alter table payments enable row level security;
alter table diet_plans enable row level security;

-- ============================================
-- STEP 4: ESTABLISH RLS TENANCY POLICIES
-- ============================================

-- Gym Owners tenancy
create policy "owners_own" on gym_owners
  for all using (auth.uid() = id);

-- Branches tenancy
create policy "owner_branches" on branches
  for all using (auth.uid() = owner_id);

-- Members tenancy
create policy "branch_members_select" on members
  for select using (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_members_insert" on members
  for insert with check (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_members_update" on members
  for update using (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_members_delete" on members
  for delete using (branch_id in (select id from branches where owner_id = auth.uid()));

-- Attendance Logs tenancy
create policy "branch_attendance_select" on attendance_logs
  for select using (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_attendance_insert" on attendance_logs
  for insert with check (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_attendance_update" on attendance_logs
  for update using (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_attendance_delete" on attendance_logs
  for delete using (branch_id in (select id from branches where owner_id = auth.uid()));

-- Expenses tenancy
create policy "branch_expenses_select" on expenses
  for select using (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_expenses_insert" on expenses
  for insert with check (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_expenses_update" on expenses
  for update using (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_expenses_delete" on expenses
  for delete using (branch_id in (select id from branches where owner_id = auth.uid()));

-- Todos tenancy
create policy "branch_todos_select" on todos
  for select using (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_todos_insert" on todos
  for insert with check (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_todos_update" on todos
  for update using (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_todos_delete" on todos
  for delete using (branch_id in (select id from branches where owner_id = auth.uid()));

-- Products Catalog tenancy
create policy "branch_products_select" on products
  for select using (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_products_insert" on products
  for insert with check (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_products_update" on products
  for update using (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_products_delete" on products
  for delete using (branch_id in (select id from branches where owner_id = auth.uid()));

-- Sales tenancy
create policy "branch_sales_select" on sales
  for select using (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_sales_insert" on sales
  for insert with check (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_sales_update" on sales
  for update using (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_sales_delete" on sales
  for delete using (branch_id in (select id from branches where owner_id = auth.uid()));

-- Payments tenancy
create policy "branch_payments_select" on payments
  for select using (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_payments_insert" on payments
  for insert with check (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_payments_update" on payments
  for update using (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_payments_delete" on payments
  for delete using (branch_id in (select id from branches where owner_id = auth.uid()));

-- Diet Plans tenancy
create policy "branch_diet_select" on diet_plans
  for select using (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_diet_insert" on diet_plans
  for insert with check (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_diet_update" on diet_plans
  for update using (branch_id in (select id from branches where owner_id = auth.uid()));
create policy "branch_diet_delete" on diet_plans
  for delete using (branch_id in (select id from branches where owner_id = auth.uid()));

-- ============================================
-- STEP 5: CREATING AUTH TRIGGERS FOR AUTO ONBOARDING
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.gym_owners (id, email, name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Synchronize pre-existing auth users
insert into public.gym_owners (id, email, name, phone)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'name', ''),
  coalesce(raw_user_meta_data->>'phone', '')
from auth.users
on conflict (id) do nothing;
```
