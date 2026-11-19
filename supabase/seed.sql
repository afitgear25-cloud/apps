insert into public.config (id, data) values ('club', '{"clubNombre":"Club Atlético","temporada":2026}'::jsonb);
insert into public.divisiones (id, data) values
('preinf', '{"id":"preinf","nombre":"Preinfantiles","orden":1,"anios":[2020,2019,2018,2017],"esPrimera":false,"cuota":15000}'::jsonb),
('inf', '{"id":"inf","nombre":"Infantiles","orden":2,"anios":[2016,2015,2014,2013],"esPrimera":false,"cuota":18000}'::jsonb),
('juv', '{"id":"juv","nombre":"Juveniles","orden":3,"anios":[2012,2011,2010,2009,2008,2007,2006],"esPrimera":false,"cuota":20000}'::jsonb),
('pri', '{"id":"pri","nombre":"Primera","orden":4,"anios":[2012,2011,2010,2009,2008,2007,2006],"esPrimera":true,"cuota":20000}'::jsonb);
insert into public.canchas (id, data) values
('c11', '{"id":"c11","nombre":"Cancha de 11","forma":"f11","zonas":[{"id":"f9a","nombre":"Fútbol 9 · A"},{"id":"f9b","nombre":"Fútbol 9 · B"},{"id":"f9c","nombre":"Fútbol 9 · C"}],"atajos":[{"nombre":"Cancha entera (11)","zonas":["f9a","f9b","f9c"]},{"nombre":"Dos de 9 (A+B)","zonas":["f9a","f9b"]},{"nombre":"Dos de 9 (B+C)","zonas":["f9b","f9c"]},{"nombre":"Fútbol 9 · A","zonas":["f9a"]},{"nombre":"Fútbol 9 · B","zonas":["f9b"]},{"nombre":"Fútbol 9 · C","zonas":["f9c"]}]}'::jsonb),
('c7a', '{"id":"c7a","nombre":"Cancha de 7 · A","forma":"f7","zonas":[{"id":"f5a1","nombre":"Fútbol 5 · A1"},{"id":"f5a2","nombre":"Fútbol 5 · A2"}],"atajos":[{"nombre":"Cancha de 7 entera","zonas":["f5a1","f5a2"]},{"nombre":"Fútbol 5 · A1","zonas":["f5a1"]},{"nombre":"Fútbol 5 · A2","zonas":["f5a2"]}]}'::jsonb),
('c7b', '{"id":"c7b","nombre":"Cancha de 7 · B","forma":"f7","zonas":[{"id":"f5b1","nombre":"Fútbol 5 · B1"},{"id":"f5b2","nombre":"Fútbol 5 · B2"}],"atajos":[{"nombre":"Cancha de 7 entera","zonas":["f5b1","f5b2"]},{"nombre":"Fútbol 5 · B1","zonas":["f5b1"]},{"nombre":"Fútbol 5 · B2","zonas":["f5b2"]}]}'::jsonb);
insert into public.prendas (id, data) values
('p-cam', '{"id":"p-cam","nombre":"Camiseta oficial","precio":28000,"obligatoria":true}'::jsonb),
('p-sho', '{"id":"p-sho","nombre":"Short","precio":14000,"obligatoria":true}'::jsonb),
('p-med', '{"id":"p-med","nombre":"Medias","precio":7000,"obligatoria":true}'::jsonb),
('p-buz', '{"id":"p-buz","nombre":"Buzo de entrenamiento","precio":35000,"obligatoria":false}'::jsonb),
('p-bol', '{"id":"p-bol","nombre":"Bolso","precio":22000,"obligatoria":false}'::jsonb);
insert into public.materiales (id, data) values
('m-pel', '{"id":"m-pel","nombre":"Pelotas N°5","total":30,"rotos":2,"ubicacion":"Depósito"}'::jsonb),
('m-pel4', '{"id":"m-pel4","nombre":"Pelotas N°4","total":20,"rotos":1,"ubicacion":"Depósito"}'::jsonb),
('m-bol', '{"id":"m-bol","nombre":"Bolsos de pelotas","total":10,"rotos":0,"ubicacion":"Depósito"}'::jsonb),
('m-con', '{"id":"m-con","nombre":"Conos","total":60,"rotos":4,"ubicacion":"Depósito"}'::jsonb),
('m-pec', '{"id":"m-pec","nombre":"Pecheras","total":40,"rotos":0,"ubicacion":"Vestuario"}'::jsonb),
('m-val', '{"id":"m-val","nombre":"Vallas","total":12,"rotos":1,"ubicacion":"Depósito"}'::jsonb),
('m-esc', '{"id":"m-esc","nombre":"Escaleras de coordinación","total":4,"rotos":0,"ubicacion":"Depósito"}'::jsonb),
('m-arc', '{"id":"m-arc","nombre":"Arcos chicos","total":6,"rotos":0,"ubicacion":"Cancha"}'::jsonb);
