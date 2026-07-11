-- Images Storage Bucket and RLS Policies

INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES (
    'images', -- noqa: CV10
    'images', -- noqa: CV10
    TRUE,
    10485760,
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp'] -- noqa: CV10
)
ON CONFLICT ("id") DO UPDATE SET
    "public" = "excluded"."public",
    "file_size_limit" = "excluded"."file_size_limit",
    "allowed_mime_types" = "excluded"."allowed_mime_types";

CREATE POLICY "Users can view their own images"
ON "storage"."objects"
FOR SELECT
TO "authenticated"
USING (
    "bucket_id" = 'images' -- noqa: CV10
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."jwt"() ->> 'sub') -- noqa: CV10
);

CREATE POLICY "Users can upload their own images"
ON "storage"."objects"
AS PERMISSIVE
FOR INSERT
TO "authenticated"
WITH CHECK (
    "bucket_id" = 'images' -- noqa: CV10
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."jwt"() ->> 'sub') -- noqa: CV10
);

CREATE POLICY "Users can delete their own images"
ON "storage"."objects"
AS PERMISSIVE
FOR DELETE
TO "authenticated"
USING (
    "bucket_id" = 'images' -- noqa: CV10
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."jwt"() ->> 'sub') -- noqa: CV10
);
