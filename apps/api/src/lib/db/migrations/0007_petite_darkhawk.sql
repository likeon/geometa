CREATE OR REPLACE VIEW meta_locations_count_view AS
SELECT meta_id, COUNT(*) AS total
FROM location_metas_view
GROUP BY meta_id;
