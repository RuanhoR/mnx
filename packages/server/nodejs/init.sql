-- PMNX Server PostgreSQL Schema
-- Run: psql $POSTGRESQL_SERVER -f init.sql

CREATE TABLE IF NOT EXISTS user_table (
  uid SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(512) NOT NULL,
  mail VARCHAR(255) UNIQUE NOT NULL,
  ctime TIMESTAMP DEFAULT NOW(),
  friends INTEGER[] DEFAULT '{}',
  friends_request INTEGER[] DEFAULT '{}',
  avatar_url TEXT
);

CREATE TABLE IF NOT EXISTS mnx_scope (
  id SERIAL PRIMARY KEY,
  "user" INTEGER UNIQUE REFERENCES user_table(uid) ON DELETE CASCADE,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mnx_readme (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  cout INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mnx_packages (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  update_at TIMESTAMP DEFAULT NOW(),
  versions JSONB DEFAULT '[]'::jsonb,
  name VARCHAR(255) NOT NULL,
  create_user INTEGER REFERENCES user_table(uid) ON DELETE SET NULL,
  scope VARCHAR(255) NOT NULL,
  point TEXT DEFAULT '',
  download INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "publish-token" (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  "user" INTEGER REFERENCES user_table(uid) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  scope TEXT[] DEFAULT '{}',
  permission INTEGER DEFAULT 0,
  "time" BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_packages_scope_name ON mnx_packages (scope, name);
CREATE INDEX IF NOT EXISTS idx_scope_user ON mnx_scope ("user");
CREATE INDEX IF NOT EXISTS idx_token_token ON "publish-token" (token);
CREATE INDEX IF NOT EXISTS idx_readme_content ON mnx_readme USING hash (content);
