-- Deja 40% como comisión predeterminada y actualiza odontólogos que aún tenían
-- el 60% predeterminado anterior. Otros porcentajes configurados se conservan.
alter table odontosonrisa.staff
  alter column commission_pct set default 40;

update odontosonrisa.staff
set commission_pct = 40
where commission_pct = 60
  and lower(split_part(role, '|', 1)) ~ '(odontolog|dentista|endodon|ortodon|implanta)';
