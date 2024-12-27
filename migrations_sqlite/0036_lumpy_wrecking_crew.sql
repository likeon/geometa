CREATE TRIGGER update_modified_at
AFTER UPDATE ON map_group_locations
FOR EACH ROW
WHEN NEW.heading != OLD.heading OR
     NEW.pitch != OLD.pitch OR
     NEW.zoom != OLD.zoom OR
     NEW.pano_id != OLD.pano_id OR
     NEW.extra_tag != OLD.extra_tag OR
     NEW.extra_pano_id != OLD.extra_pano_id OR
     NEW.extra_pano_date != OLD.extra_pano_date
BEGIN
    UPDATE map_group_locations
    SET modified_at = strftime('%s', 'now')
    WHERE id = NEW.id;
END;
