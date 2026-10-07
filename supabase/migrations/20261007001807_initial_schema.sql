create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  vehicle_consumption_km_l numeric(6,2) check (vehicle_consumption_km_l > 0 and vehicle_consumption_km_l <= 100),
  default_fill_liters numeric(6,2) check (default_fill_liters > 0 and default_fill_liters <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  address text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.fuel_type as enum ('gasoline', 'ethanol', 'diesel', 'diesel_s10');

create table public.price_reports (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id),
  user_id uuid not null references public.profiles(id),
  fuel_type public.fuel_type not null,
  price numeric(6,3) not null check (price >= 1 and price <= 20),
  photo_path text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  location_accuracy double precision check (location_accuracy >= 0),
  created_at timestamptz not null default now(),
  check (photo_path is null or photo_path ~ '^price-reports/[0-9a-f-]+/[0-9]{4}/[0-9]{2}/[0-9a-f-]+\.(webp|jpg)$')
);

create table public.station_comments (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id),
  user_id uuid not null references public.profiles(id),
  comment text not null check (char_length(trim(comment)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index price_reports_latest_idx on public.price_reports (station_id, fuel_type, created_at desc, id desc);
create index station_comments_recent_idx on public.station_comments (station_id, created_at desc);
create index price_reports_user_idx on public.price_reports (user_id);

create schema if not exists private;
create function private.create_profile_for_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name) values (new.id, split_part(coalesce(new.email, 'Integrante'), '@', 1));
  return new;
end;
$$;
revoke all on function private.create_profile_for_user() from public, anon, authenticated;
create trigger create_profile_after_signup after insert on auth.users for each row execute function private.create_profile_for_user();
insert into public.profiles (id, name)
select id, split_part(coalesce(email, 'Integrante'), '@', 1) from auth.users
on conflict (id) do nothing;

create view public.latest_prices with (security_invoker = true) as
select distinct on (station_id, fuel_type) id, station_id, user_id, fuel_type, price, photo_path, created_at
from public.price_reports
order by station_id, fuel_type, created_at desc, id desc;

alter table public.profiles enable row level security;
alter table public.stations enable row level security;
alter table public.price_reports enable row level security;
alter table public.station_comments enable row level security;

revoke all on public.profiles, public.stations, public.price_reports, public.station_comments, public.latest_prices from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.stations to authenticated;
grant select, insert on public.price_reports to authenticated;
grant select, insert, update, delete on public.station_comments to authenticated;
grant select on public.latest_prices to authenticated;

create policy "group reads profiles" on public.profiles for select to authenticated using ((select auth.uid()) is not null);
create policy "create own profile" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "edit own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "group reads active stations" on public.stations for select to authenticated using (active = true);
create policy "group reads reports" on public.price_reports for select to authenticated using ((select auth.uid()) is not null);
create policy "create own report" on public.price_reports for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.stations s where s.id = station_id and s.active));
create policy "group reads comments" on public.station_comments for select to authenticated using ((select auth.uid()) is not null);
create policy "create own comment" on public.station_comments for insert to authenticated with check (user_id = (select auth.uid()));
create policy "edit own comment" on public.station_comments for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own comment" on public.station_comments for delete to authenticated using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('station-photos', 'station-photos', false, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "group reads station photos" on storage.objects for select to authenticated
using (bucket_id = 'station-photos' and (select auth.uid()) is not null);
create policy "upload own station photo" on storage.objects for insert to authenticated
with check (bucket_id = 'station-photos' and (storage.foldername(name))[1] = 'price-reports' and (storage.foldername(name))[2] = (select auth.uid())::text);
create policy "remove own station photo" on storage.objects for delete to authenticated
using (bucket_id = 'station-photos' and (storage.foldername(name))[1] = 'price-reports' and (storage.foldername(name))[2] = (select auth.uid())::text);
