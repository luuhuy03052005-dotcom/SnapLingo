import type { Config } from 'drizzle-kit'

export default {
  schema: './src/infra/db/schema.ts',
  out: './src/infra/db/migrations',
  driver: 'better-sqlite3',
  dbCredentials: {
    url: 'snaplingo.db'
  }
} as Config
