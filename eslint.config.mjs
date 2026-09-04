import { defineConfig,globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files:['components/customer/customer-pages.tsx','components/owner/owner-pages.tsx','components/customer/production-payment.tsx'],
    rules:{'react-hooks/purity':'off','react-hooks/immutability':'off','react-hooks/set-state-in-effect':'off'},
  },
  globalIgnores(['.next/**','.next-e2e/**','artifacts/**','node_modules/**','.pnpm-store/**','next-env.d.ts']),
])
