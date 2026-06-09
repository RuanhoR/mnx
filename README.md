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

### Cloudflare

Create packages/server/wrangler.jsonc with your supabase account and resend account.  
Then, add your account system.(The source code use other project's account system)
Then, deploy with cloudflare.
If you can't use supsbase storage, you can change Stroage (packages/server/wrangler/framework.ts) to use your way.

### Nodejs

Create your postgresql and redis.
Change frame.ts

### Client (page)

1. Edit packages/page/src/config.ts.
2. Build and Deploy to your static file cdn
