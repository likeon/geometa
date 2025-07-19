alter table map_group_locations
    alter column modified_at set default 1730419200;
alter table maps
    alter column is_published set default false;
alter table maps
    alter column is_community set default false;
alter table maps
    alter column auto_update set default false;
alter table maps
    alter column is_verified set default false;
alter table maps
    alter column authors set default '';
alter table maps
    alter column ordering set default 0;
alter table maps
    alter column footer set default '';
alter table maps
    alter column footer_html set default '';
alter table maps
    alter column modified_at set default 1730419200;
alter table maps
    alter column difficulty set default 0;
alter table map_filters
    alter column is_exclude set default false;
alter table metas
    alter column note_html set default '';
alter table metas
    alter column footer set default '';
alter table metas
    alter column footer_html set default '';
alter table metas
    alter column note_from_plonkit set default false;
alter table metas
    alter column has_image set default false;
alter table metas
    alter column modified_at set default 1730419200;
alter table "user"
    alter column is_trusted set default false;
alter table "user"
    alter column is_superadmin set default false;
alter table map_data
    alter column last_updated_panoids set default '[]';
alter table regions
    alter column ordering set default 0;
