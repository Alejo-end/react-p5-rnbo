import { defineConfig, globalIgnores } from 'eslint/config'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

// `next lint` is gone in Next 16, and `eslint .` does not skip build output.
export default defineConfig([
  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts', '_templates/**']),
  {
    extends: [...nextCoreWebVitals, ...nextTypescript],
  },
])
