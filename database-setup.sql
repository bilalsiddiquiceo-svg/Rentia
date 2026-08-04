-- ============================================================
-- Rental SaaS - Database Setup SQL (Phase 1)
-- Paste this into: Supabase Dashboard -> SQL Editor -> New query -> Run
-- This creates the exact tables Prisma expects (quoted model names).
-- ============================================================

-- Role enum (Prisma enum "Role")
CREATE TYPE "Role" AS ENUM ('user', 'owner');

-- Users table (Prisma model "User")
CREATE TABLE "User" (
  "id"            TEXT PRIMARY KEY,                    -- Prisma generates uuid() client-side
  "email"         TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "name"          TEXT,
  "role"          "Role" NOT NULL DEFAULT 'user',
  "phone"         TEXT,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (Prisma model "Session") - refresh token hashes
CREATE TABLE "Session" (
  "id"                 TEXT PRIMARY KEY,
  "user_id"            TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "refresh_token_hash" TEXT NOT NULL,
  "expires_at"         TIMESTAMP(3) NOT NULL,
  "revoked_at"         TIMESTAMP(3),
  "user_agent"         TEXT,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Session_user_id_idx" ON "Session"("user_id");

-- Owner upgrade requests (Prisma model "OwnerUpgradeRequest")
CREATE TABLE "OwnerUpgradeRequest" (
  "id"           TEXT PRIMARY KEY,
  "user_id"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "token_hash"   TEXT NOT NULL,
  "expires_at"   TIMESTAMP(3) NOT NULL,
  "confirmed_at" TIMESTAMP(3),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "OwnerUpgradeRequest_user_id_idx" ON "OwnerUpgradeRequest"("user_id");
