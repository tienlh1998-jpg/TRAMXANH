-- Five fixed test rewards for development only. Never overwrite existing stock.
begin;
insert into public.rewards(id,name,description,image_url,points_cost,stock) values
('30000000-0000-4000-8000-000000000001','Bút viết xanh','Quà mẫu để kiểm thử, chưa phải quà pilot.','/rewards/gift.svg',40,20),
('30000000-0000-4000-8000-000000000002','Sổ tay tái chế','Quà mẫu để kiểm thử.','/rewards/gift.svg',150,15),
('30000000-0000-4000-8000-000000000003','Túi vải','Quà mẫu để kiểm thử.','/rewards/gift.svg',250,10),
('30000000-0000-4000-8000-000000000004','Chậu sen đá nhỏ','Quà mẫu để kiểm thử.','/rewards/gift.svg',350,8),
('30000000-0000-4000-8000-000000000005','Bình nước cá nhân','Quà mẫu để kiểm thử.','/rewards/gift.svg',800,5)
on conflict(id) do nothing;
commit;
