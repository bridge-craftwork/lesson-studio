import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Kept separate from vite.config.ts (which the build typechecks) so the `test`
// field never collides with Vite's UserConfig types. Inherits the shared
// resolve.alias / dedupe from the app config.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'node',
    },
  }),
)
