-- Desenvolvimento local somente. Substitua por postos reais no projeto hospedado.
insert into public.stations (id, name, address, latitude, longitude) values
('10000000-0000-4000-8000-000000000001', 'Posto da Praça', 'Av. Central, 120', -15.5989, -56.0949),
('10000000-0000-4000-8000-000000000002', 'Posto Avenida', 'Av. das Flores, 540', -15.6018, -56.0884),
('10000000-0000-4000-8000-000000000003', 'Posto Norte', 'Rua do Norte, 82', -15.5890, -56.0972),
('10000000-0000-4000-8000-000000000004', 'Posto Mercado', 'Rua do Mercado, 321', -15.6054, -56.0981),
('10000000-0000-4000-8000-000000000005', 'Posto Lago', 'Av. do Lago, 900', -15.6075, -56.0845),
('10000000-0000-4000-8000-000000000006', 'Posto Estação', 'Rua da Estação, 44', -15.5942, -56.1057)
on conflict (id) do nothing;

-- Após criar o primeiro usuário local, execute este arquivo de novo para incluir preços de exemplo.
do $$
declare demo_user uuid;
begin
  select id into demo_user from public.profiles order by created_at limit 1;
  if demo_user is not null and not exists (select 1 from public.price_reports where station_id = '10000000-0000-4000-8000-000000000001') then
    insert into public.price_reports (station_id, user_id, fuel_type, price, created_at) values
    ('10000000-0000-4000-8000-000000000001', demo_user, 'gasoline', 5.89, now() - interval '2 hours'),
    ('10000000-0000-4000-8000-000000000002', demo_user, 'gasoline', 5.79, now() - interval '1 day'),
    ('10000000-0000-4000-8000-000000000003', demo_user, 'gasoline', 5.95, now() - interval '5 days'),
    ('10000000-0000-4000-8000-000000000004', demo_user, 'gasoline', 5.84, now() - interval '8 hours'),
    ('10000000-0000-4000-8000-000000000005', demo_user, 'gasoline', 5.99, now() - interval '9 days'),
    ('10000000-0000-4000-8000-000000000006', demo_user, 'gasoline', 5.82, now() - interval '3 days');
  end if;
end $$;
