-- Folders Table Schema and RLS Policies
-- Self-referencing adjacency list: parent_id NULL means the folder is at the root.
-- Arbitrary nesting depth is supported; deep-tree reads use WITH RECURSIVE.

-- Table Definition
CREATE TABLE "folders" (
    "id" UUID PRIMARY KEY DEFAULT "gen_random_uuid"(),
    "user_id" TEXT NOT NULL DEFAULT "auth"."jwt"() ->> 'sub', -- noqa: CV10
    "name" TEXT NOT NULL,
    "parent_id" UUID REFERENCES "folders" ("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ
);

-- Indexes for child lookups and per-user filtering
CREATE INDEX "folders_parent_id_idx" ON "folders" ("parent_id"); -- noqa: PG01

CREATE INDEX "folders_user_id_idx" ON "folders" ("user_id"); -- noqa: PG01

-- Row Level Security Policies
ALTER TABLE "folders" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view their own folders"
ON "public"."folders"
FOR SELECT
TO "authenticated"
USING (
    ((SELECT "auth"."jwt"() ->> 'sub') = ("user_id")::TEXT) -- noqa: CV10
);

CREATE POLICY "Users must insert their own folders"
ON "public"."folders"
AS PERMISSIVE
FOR INSERT
TO "authenticated"
WITH CHECK (
    ((SELECT "auth"."jwt"() ->> 'sub') = ("user_id")::TEXT) -- noqa: CV10
);

CREATE POLICY "Users can update their own folders"
ON "public"."folders"
AS PERMISSIVE
FOR UPDATE
TO "authenticated"
USING (
    ((SELECT "auth"."jwt"() ->> 'sub') = ("user_id")::TEXT) -- noqa: CV10
);

CREATE POLICY "Users can delete their own folders"
ON "public"."folders"
AS PERMISSIVE
FOR DELETE
TO "authenticated"
USING (
    ((SELECT "auth"."jwt"() ->> 'sub') = ("user_id")::TEXT) -- noqa: CV10
);

-- Trigger to update updated_at timestamp on row update
CREATE TRIGGER "set_updated_at"
BEFORE UPDATE ON "folders"
FOR EACH ROW
EXECUTE FUNCTION "update_updated_at_column"();

-- Trigger to reject changes that would make a folder its own ancestor
CREATE TRIGGER "prevent_folder_cycle"
BEFORE INSERT OR UPDATE ON "folders"
FOR EACH ROW
EXECUTE FUNCTION "prevent_folder_cycle"();

-- Link documents to folders (nullable: NULL folder_id means the document is at the root).
-- Declared here rather than in 01_documents.sql because the folders table (02_)
-- must exist before this foreign key can reference it.

ALTER TABLE "documents"
ADD COLUMN "folder_id" UUID REFERENCES "folders" ("id") ON DELETE CASCADE;

CREATE INDEX "documents_folder_id_idx" ON "documents" ("folder_id"); -- noqa: PG01
