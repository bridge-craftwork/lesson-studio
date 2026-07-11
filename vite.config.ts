import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const PACKAGE = '@bridge-craftwork/bridge-components'

// Contract 2 consumption model: live-in-dev, pinned-in-CI.
//
//   Phase 1 (now): components are copied-in at src/bridge/ and the package
//   name resolves there. This proves the components work in the consumer
//   before extraction.
//
//   Phase 2: point BRIDGE_COMPONENTS_SRC at a sibling Bridge-Classroom
//   checkout (…/packages/bridge-components/src) for cross-repo HMR, or drop
//   the alias entirely and install the published, pinned package.
const siblingSrc = process.env.BRIDGE_COMPONENTS_SRC
const bridgeComponents = siblingSrc
  ? siblingSrc
  : fileURLToPath(new URL('./src/bridge', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      [PACKAGE]: bridgeComponents,
    },
    // A single Vue instance across the app and the (aliased) component package
    // prevents duplicate-Vue reactivity bugs. Required by Contract 2.
    dedupe: ['vue'],
  },
})
