DROP TRIGGER IF EXISTS trigger_map_group_location_update_modified ON map_group_locations;
DROP FUNCTION map_group_location_update_modified;

CREATE OR REPLACE FUNCTION map_group_location_update_modified()
RETURNS TRIGGER AS $$
BEGIN
    IF row(NEW.*) IS DISTINCT FROM row(OLD.*) THEN
        NEW.modified_at = EXTRACT(EPOCH FROM NOW())::int;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_modified
BEFORE UPDATE ON map_group_locations
FOR EACH ROW
WHEN (OLD IS DISTINCT FROM NEW)
EXECUTE FUNCTION map_group_location_update_modified();
