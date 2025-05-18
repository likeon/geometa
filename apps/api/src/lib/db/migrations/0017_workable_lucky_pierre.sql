CREATE OR REPLACE FUNCTION get_country_from_tag_name(tag_name TEXT)
RETURNS TEXT AS $$
DECLARE
    country_raw TEXT;
BEGIN
    -- Split the tag name and get the first part
    country_raw := split_part(tag_name, '-', 1);

    -- Check for the special case
    IF country_raw = 'UsVirginIslands' THEN
        RETURN 'US Virgin Islands';
    END IF;

    -- Replace camelCase with spaces using regex
    RETURN regexp_replace(country_raw, '([a-z])([A-Z])', '\1 \2', 'g');
END;
$$ LANGUAGE plpgsql;
