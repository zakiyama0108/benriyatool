#!/usr/bin/env node
// SUPABASE_READONLY_DB_URL(読み取り専用ロールの接続文字列。.env.localのみに置き、CIには入れない)で
// 本番DBにSELECT専用クエリを実行する(仕様: docs/adr/0004-agent-readonly-db-access.md)。
// ロール自体がSELECT以外の権限を持たないため、実行するSQLの内容に関わらずINSERT/UPDATE/DELETEは失敗する。
import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '../../../.env.local') })

async function readStdin() {
  let data = ''
  for await (const chunk of process.stdin) data += chunk
  return data
}

const sql = process.argv.slice(2).join(' ').trim() || (await readStdin()).trim()

if (!sql) {
  console.error('使い方: node query.mjs "select ..." または SQLをstdinで渡す')
  process.exit(1)
}
if (!process.env.SUPABASE_READONLY_DB_URL) {
  console.error('SUPABASE_READONLY_DB_URL が .env.local に設定されていません(docs/adr/0004参照)')
  process.exit(1)
}

const client = new pg.Client({ connectionString: process.env.SUPABASE_READONLY_DB_URL })

await client.connect()
try {
  const result = await client.query(sql)
  console.table(result.rows)
  console.error(`${result.rowCount}件`)
} finally {
  await client.end()
}
