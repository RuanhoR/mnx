# mnx

mnx is a mcbe addon market, it's cli is [mbler](https://github.com/RuanhoR/mbler.git)

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