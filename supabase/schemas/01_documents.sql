-- Documents Table Schema and RLS Policies

-- Table Definition
CREATE TABLE "documents" (
    "id" UUID PRIMARY KEY DEFAULT "gen_random_uuid"(),
    "user_id" TEXT NOT NULL DEFAULT "auth"."jwt"() ->> 'sub', -- noqa: CV10
    "title" TEXT,
    "description" TEXT,
    "content" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ
);

-- Row Level Security Policies
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view their own documents"
ON "public"."documents"
FOR SELECT
TO "authenticated"
USING (
    ((SELECT "auth"."jwt"() ->> 'sub') = ("user_id")::TEXT) -- noqa: CV10
);

CREATE POLICY "Users must insert their own documents"
ON "public"."documents"
AS PERMISSIVE
FOR INSERT
TO "authenticated"
WITH CHECK (
    ((SELECT "auth"."jwt"() ->> 'sub') = ("user_id")::TEXT) -- noqa: CV10
);

CREATE POLICY "Users can update their own documents"
ON "public"."documents"
AS PERMISSIVE
FOR UPDATE
TO "authenticated"
USING (
    ((SELECT "auth"."jwt"() ->> 'sub') = ("user_id")::TEXT) -- noqa: CV10
)
WITH CHECK (
    ((SELECT "auth"."jwt"() ->> 'sub') = ("user_id")::TEXT) -- noqa: CV10
);

CREATE POLICY "Users can delete their own documents"
ON "public"."documents"
AS PERMISSIVE
FOR DELETE
TO "authenticated"
USING (
    ((SELECT "auth"."jwt"() ->> 'sub') = ("user_id")::TEXT) -- noqa: CV10
);

-- Trigger to update updated_at timestamp on row update
CREATE TRIGGER "set_updated_at"
BEFORE UPDATE ON "documents"
FOR EACH ROW
EXECUTE FUNCTION "update_updated_at_column"();
