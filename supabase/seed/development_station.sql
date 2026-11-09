-- ONLY for the development project. Trial rates, not official pilot rates.
begin;
insert into public.system_settings(id,max_weight_kg,qr_ttl_seconds) values(true,50,120) on conflict(id) do nothing;
insert into public.material_types(name,points_per_kg) values('Chai nhựa PET',100),('Giấy / bìa',30),('Lon nhôm',200) on conflict(name) do nothing;
insert into public.stations(id,name,location) values('20000000-0000-4000-8000-000000000001','Trạm Xanh thử nghiệm','Môi trường phát triển') on conflict(id) do nothing;
commit;
