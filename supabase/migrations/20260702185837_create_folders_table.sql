CREATE TABLE "public"."folders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL DEFAULT ("auth"."jwt"() ->> 'sub'::TEXT), -- noqa: CV10
    "name" TEXT NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE
);

ALTER TABLE "public"."folders" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."documents" ADD COLUMN "folder_id" UUID;

CREATE UNIQUE INDEX "folders_pkey" ON "public"."folders" USING "btree" ("id");

CREATE INDEX "folders_parent_id_idx" ON "public"."folders" USING "btree" ("parent_id"); -- noqa: PG01

CREATE INDEX "folders_user_id_idx" ON "public"."folders" USING "btree" ("user_id"); -- noqa: PG01

CREATE INDEX "documents_folder_id_idx" ON "public"."documents" USING "btree" ("folder_id"); -- noqa: PG01

ALTER TABLE "public"."folders" ADD CONSTRAINT "folders_pkey" PRIMARY KEY USING INDEX "folders_pkey";

ALTER TABLE "public"."folders" ADD CONSTRAINT "folders_parent_id_fkey" -- noqa: PG01
FOREIGN KEY ("parent_id") REFERENCES "public"."folders" ("id") ON DELETE CASCADE;

ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_folder_id_fkey" -- noqa: PG01
FOREIGN KEY ("folder_id") REFERENCES "public"."folders" ("id") ON DELETE CASCADE;

-- Cycle guard: reject any change that would make a folder its own ancestor
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

-- Ownership guard: a folder's parent_id must reference a folder owned by the same user
CREATE OR REPLACE FUNCTION "public"."enforce_folder_parent_owner"() RETURNS "trigger" --noqa
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    "parent_owner" TEXT;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT "user_id" INTO "parent_owner"
    FROM "public"."folders"
    WHERE "id" = NEW.parent_id;

    IF "parent_owner" IS NULL OR "parent_owner" IS DISTINCT FROM NEW.user_id THEN
        RAISE EXCEPTION 'parent folder must belong to the same user';
    END IF;

    RETURN NEW;
END;
$$;

-- Ownership guard: a document's folder_id must reference a folder owned by the same user
CREATE OR REPLACE FUNCTION "public"."enforce_document_folder_owner"() RETURNS "trigger" --noqa
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    "folder_owner" TEXT;
BEGIN
    IF NEW.folder_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT "user_id" INTO "folder_owner"
    FROM "public"."folders"
    WHERE "id" = NEW.folder_id;

    IF "folder_owner" IS NULL OR "folder_owner" IS DISTINCT FROM NEW.user_id THEN
        RAISE EXCEPTION 'folder must belong to the same user as the document';
    END IF;

    RETURN NEW;
END;
$$;

GRANT DELETE ON TABLE "public"."folders" TO "anon";

GRANT INSERT ON TABLE "public"."folders" TO "anon";

GRANT REFERENCES ON TABLE "public"."folders" TO "anon";

GRANT SELECT ON TABLE "public"."folders" TO "anon";

GRANT TRIGGER ON TABLE "public"."folders" TO "anon";

GRANT TRUNCATE ON TABLE "public"."folders" TO "anon";

GRANT UPDATE ON TABLE "public"."folders" TO "anon";

GRANT DELETE ON TABLE "public"."folders" TO "authenticated";

GRANT INSERT ON TABLE "public"."folders" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."folders" TO "authenticated";

GRANT SELECT ON TABLE "public"."folders" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."folders" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."folders" TO "authenticated";

GRANT UPDATE ON TABLE "public"."folders" TO "authenticated";

GRANT DELETE ON TABLE "public"."folders" TO "service_role";

GRANT INSERT ON TABLE "public"."folders" TO "service_role";

GRANT REFERENCES ON TABLE "public"."folders" TO "service_role";

GRANT SELECT ON TABLE "public"."folders" TO "service_role";

GRANT TRIGGER ON TABLE "public"."folders" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."folders" TO "service_role";

GRANT UPDATE ON TABLE "public"."folders" TO "service_role";

CREATE POLICY "User can view their own folders"
ON "public"."folders"
AS PERMISSIVE
FOR SELECT
TO "authenticated"
USING (((select("auth"."jwt"() ->> 'sub'::TEXT)) = "user_id")); -- noqa: CV10

CREATE POLICY "Users can delete their own folders"
ON "public"."folders"
AS PERMISSIVE
FOR DELETE
TO "authenticated"
USING (((select("auth"."jwt"() ->> 'sub'::TEXT)) = "user_id")); -- noqa: CV10

CREATE POLICY "Users can update their own folders"
ON "public"."folders"
AS PERMISSIVE
FOR UPDATE
TO "authenticated"
USING (((select("auth"."jwt"() ->> 'sub'::TEXT)) = "user_id")) -- noqa: CV10
WITH CHECK (((select("auth"."jwt"() ->> 'sub'::TEXT)) = "user_id")); -- noqa: CV10

CREATE POLICY "Users must insert their own folders"
ON "public"."folders"
AS PERMISSIVE
FOR INSERT
TO "authenticated"
WITH CHECK (((select("auth"."jwt"() ->> 'sub'::TEXT)) = "user_id")); -- noqa: CV10

-- Add WITH CHECK to the existing documents UPDATE policy so a user cannot
-- reassign a document's user_id (defense-in-depth alongside the folder-owner trigger).
DROP POLICY "Users can update their own documents" ON "public"."documents";

CREATE POLICY "Users can update their own documents"
ON "public"."documents"
AS PERMISSIVE
FOR UPDATE
TO "authenticated"
USING (((select("auth"."jwt"() ->> 'sub'::TEXT)) = "user_id")) -- noqa: CV10
WITH CHECK (((select("auth"."jwt"() ->> 'sub'::TEXT)) = "user_id")); -- noqa: CV10

CREATE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."folders"
FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE TRIGGER "prevent_folder_cycle" BEFORE INSERT OR UPDATE ON "public"."folders"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_folder_cycle"();

CREATE TRIGGER "enforce_folder_parent_owner" BEFORE INSERT OR UPDATE ON "public"."folders"
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_folder_parent_owner"();

CREATE TRIGGER "enforce_document_folder_owner" BEFORE INSERT OR UPDATE ON "public"."documents"
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_document_folder_owner"();
