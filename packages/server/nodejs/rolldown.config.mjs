import { defineConfig } from 'rolldown'

export default defineConfig({
  input: 'src/index.ts',
  platform: 'node',
  output: {
    dir: 'dist',
    format: 'esm',
    entryFileNames: 'index.js',
  },
  external: ['pg', 'redis'],
  resolve: {
    extensions: ['.ts', '.js', '.mjs', '.json'],
  },
})
