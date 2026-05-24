# PMNX Server - Node.js Runtime

Node.js runtime for the PMNX package registry server.

## Requirements

- Node.js 18+
- Redis server (for KV cache / locks)
- PostgreSQL server (for data storage)
- Local filesystem (for package file storage)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_SERVER` | Redis connection string | `redis://localhost:6379` |
| `POSTGRESQL_SERVER` | PostgreSQL connection string | `postgresql://localhost:5432/pmnx` |
| `STORAGE_PATH` | Local storage directory | `./data/storage` |
| `HOST` | Public server host | `http://localhost:3000` |
| `PORT` | HTTP listen port | `3000` |
| `ALLOW_CORS` | CORS allowed origin | `localhost` |
| `PASSWORD_ITERATIONS` | PBKDF2 iterations | `2000` |

## Quick Start

```bash
# Install dependencies
npm install

# Set env vars and start
export REDIS_SERVER=redis://localhost:6379
export POSTGRESQL_SERVER=postgresql://user:pass@localhost:5432/pmnx
node src/index.js
```

## API Endpoints

See [PMNX API documentation](#).
