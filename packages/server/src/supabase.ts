import { createClient } from '@supabase/supabase-js'
import { env } from 'cloudflare:workers'
import type { Database } from './supabase.types'
const client = createClient<Database>(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_KEY)
export default class {
  static client = client;
  static get users() {
    return client.from('user_table');
  }

  static get pmnxPackage() {
    return client.from('mnx_packages');
  }

  static get pmnxScope() {
    return client.from('mnx_scope');
  }

  static get pmnxReadme() {
    return client.from('mnx_readme');
  }
}