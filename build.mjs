// voice-ai-girlfriend build: esbuild browser bundle shaped like the DSH
// client plugin artifact (lib/client.js, __ModuleLoader__ closure). All
// @deepseek-ai / react imports stay external — the DSH host provides them.
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'

const PKG_ID = '@beiyege-01/dsh-voice-ai-girlfriend'

const EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-runtime',
  '@deepseek-ai/dsh-client-ui-conversation',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-locale',
  '@deepseek-ai/dsh-invariants',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-web-react',
]

mkdirSync('lib', { recursive: true })

await build({
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  jsx: 'automatic',
  external: EXTERNALS,
  banner: {
    js:
      `window.__ModuleLoader__.load({ id: ${JSON.stringify(PKG_ID)}, factory: (require) => {\n` +
      'var module = { exports: {} }; var exports = module.exports;',
  },
  footer: {
    js: 'return module.exports; } });',
  },
  logLevel: 'info',
})

console.log('[voice-ai-girlfriend] build done: lib/client.js (browser)')
