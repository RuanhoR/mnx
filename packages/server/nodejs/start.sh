#!/bin/bash
set -e

echo "=== PMNX Server - Node.js ==="

export REDIS_SERVER="${REDIS_SERVER:-redis://localhost:6379}"
export POSTGRESQL_SERVER="${POSTGRESQL_SERVER:-postgresql://localhost:5432/pmnx}"
export STORAGE_PATH="${STORAGE_PATH:-./data/storage}"
export HOST="${HOST:-http://localhost:3000}"
export PORT="${PORT:-3000}"
export ALLOW_CORS="${ALLOW_CORS:-localhost}"
export PASSWORD_ITERATIONS="${PASSWORD_ITERATIONS:-2000}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[start] Starting server on $HOST:$PORT..."
cd "$SCRIPT_DIR" && node dist/index.js
