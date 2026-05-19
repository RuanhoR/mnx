# mnx

mnx is a mcbe addon market, it's cli is [mbler](https://github.com/RuanhoR/mbler.git)

## About repo

[MCX CORE](https://github.com/RuanhoR/mcx-core) | [MCX Language Server](https://github.com/RuanhoR/mcx-language-server) | [MCX Template](https://github.com/RuanhoR/mcx-template)

## Deploy

First, clone this repo

```bash
git clone git@github.com:RuanhoR/mnx.git
```

### Server

Create packages/server/wrangler.jsonc with your supabase account and resend account.  
Then, deploy with cloudflare.

### Client

1. Edit packages/client/src/config.ts.
2. Build and Deploy to your static file cdn
