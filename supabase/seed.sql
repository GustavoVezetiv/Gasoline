-- Desenvolvimento local somente. Substitua por postos reais no projeto hospedado.
insert into public.stations (id, name, address, latitude, longitude) values
('10000000-0000-4000-8000-000000000001', 'Posto da Praça', 'Av. Central, 120', -15.5989, -56.0949),
('10000000-0000-4000-8000-000000000002', 'Posto Avenida', 'Av. das Flores, 540', -15.6018, -56.0884),
('10000000-0000-4000-8000-000000000003', 'Posto Norte', 'Rua do Norte, 82', -15.5890, -56.0972),
('10000000-0000-4000-8000-000000000004', 'Posto Mercado', 'Rua do Mercado, 321', -15.6054, -56.0981),
('10000000-0000-4000-8000-000000000005', 'Posto Lago', 'Av. do Lago, 900', -15.6075, -56.0845),
('10000000-0000-4000-8000-000000000006', 'Posto Estação', 'Rua da Estação, 44', -15.5942, -56.1057)
on conflict (id) do nothing;

-- Após criar o primeiro usuário local, execute este arquivo de novo para incluir histórico dos quatro combustíveis.
do $$
declare demo_user uuid;
begin
  select id into demo_user from public.profiles order by created_at limit 1;
  if demo_user is not null and not exists (select 1 from public.price_reports where user_id = demo_user) then
    insert into public.price_reports (station_id, user_id, fuel_type, price, created_at)
    select station.id, demo_user, fuel.fuel_type,
      round((fuel.base_price + ((right(station.id, 1)::integer - 3) * 0.018) + (sample.step * 0.012))::numeric, 3),
      now() - ((5 - sample.step) * interval '14 days') - (right(station.id, 1)::integer * interval '2 hours')
    from public.stations station
    cross join (values
      ('gasoline'::public.fuel_type, 5.79::numeric),
      ('ethanol'::public.fuel_type, 3.89::numeric),
      ('diesel'::public.fuel_type, 5.99::numeric),
      ('diesel_s10'::public.fuel_type, 6.09::numeric)
    ) as fuel(fuel_type, base_price)
    cross join generate_series(0, 5) as sample(step);
  end if;
end $$;
