#!/usr/bin/env node
const { execSync } = require('child_process')
const { cpSync, rmSync, existsSync, mkdirSync, readdirSync, lstatSync } = require('fs')
const { join, relative } = require('path')

const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'src')
const WRANGLER_DIR = join(ROOT, 'wrangler')
const NODEJS_DIR = join(ROOT, 'nodejs')

function copyDir(src, dest, exclude = []) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true })
  const entries = readdirSync(src)
  for (const entry of entries) {
    if (exclude.includes(entry)) continue
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    if (lstatSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath, exclude)
    } else {
      cpSync(srcPath, destPath)
    }
  }
}

function buildCloudflare() {
  console.log('[build] Target: Cloudflare Workers')

  const wranglerSrc = join(WRANGLER_DIR, 'src')
  if (existsSync(wranglerSrc)) rmSync(wranglerSrc, { recursive: true })

  console.log('[build] Copying src/ -> wrangler/src/')
  copyDir(SRC, wranglerSrc, ['framework.d.ts'])

  console.log('[build] Copying wrangler/framework.ts -> wrangler/src/framework.ts')
  cpSync(join(WRANGLER_DIR, 'framework.ts'), join(wranglerSrc, 'framework.ts'))

  console.log('[build] Running wrangler deploy...')
  execSync('pnpm wrangler deploy --config wrangler/wrangler.jsonc', { cwd: ROOT, stdio: 'inherit' })
  console.log('[build] Cloudflare deploy complete.')
}

function buildNodejs() {
  console.log('[build] Target: Node.js')

  const nodeSrc = join(NODEJS_DIR, 'src')
  if (existsSync(nodeSrc)) rmSync(nodeSrc, { recursive: true })

  console.log('[build] Copying src/ -> nodejs/src/')
  copyDir(SRC, nodeSrc, ['framework.d.ts', 'worker-configuration.d.ts'])

  console.log('[build] Copying nodejs/framework.ts -> nodejs/src/framework.ts')
  cpSync(join(NODEJS_DIR, 'framework.ts'), join(nodeSrc, 'framework.ts'))

  console.log('[build] Copying nodejs/index.ts -> nodejs/src/index.ts')
  cpSync(join(NODEJS_DIR, 'index.ts'), join(nodeSrc, 'index.ts'))

  console.log('[build] Installing dependencies...')
  execSync('pnpm install --ignore-workspace --ignore-scripts', { cwd: NODEJS_DIR, stdio: 'inherit' })

  console.log('[build] Bundling with rolldown...')
  execSync('pnpm exec rolldown -c', { cwd: NODEJS_DIR, stdio: 'inherit' })
  console.log('[build] Node.js build complete.')
}

function usage() {
  console.log('Usage: node scripts/build.js <target>')
  console.log('  cloudflare  - Build & deploy to Cloudflare Workers')
  console.log('  nodejs      - Build Node.js version')
  process.exit(1)
}

const target = process.argv[2]
if (!target) usage()

switch (target) {
  case 'cloudflare':
    buildCloudflare()
    break
  case 'nodejs':
    buildNodejs()
    break
  default:
    usage()
}
