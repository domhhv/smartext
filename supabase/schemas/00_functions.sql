-- Utility functions for the application

-- Function to automatically update updated_at with current timestamp on row update
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger" --noqa
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Function to prevent a folder from becoming its own ancestor (cycle guard)
CREATE OR REPLACE FUNCTION "public"."prevent_folder_cycle"() RETURNS "trigger" --noqa
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    "ancestor" UUID;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.parent_id = NEW.id THEN
        RAISE EXCEPTION 'folder cannot be its own ancestor';
    END IF;

    -- Walk the ancestor chain upward from the proposed parent.
    -- If NEW.id appears among the ancestors, the update would form a cycle.
    FOR "ancestor" IN
        WITH RECURSIVE "ancestors" AS (
            SELECT "id", "parent_id"
            FROM "public"."folders"
            WHERE "id" = NEW.parent_id
            UNION ALL
            SELECT "f"."id", "f"."parent_id"
            FROM "public"."folders" AS "f"
            INNER JOIN "ancestors" AS "a" ON "f"."id" = "a"."parent_id"
        )
        SELECT "id" FROM "ancestors"
    LOOP
        IF "ancestor" = NEW.id THEN
            RAISE EXCEPTION 'folder cannot be its own ancestor';
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;
