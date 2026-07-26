#!/usr/bin/env node
// 個人PCで用意したファイル・テキストを固定の会社メールアドレスへGmail SMTPで送信する。
// 送信元・宛先は固定(誤送信の余地を減らすため、送信先をCLI引数で変えられるようにしない)。
// 呼び出し側(Claude)が送信前に対話で最終確認する運用が前提(SKILL.md参照)。
import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import nodemailer from 'nodemailer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '.env') })

const TO_ADDRESS = 'ryosuke.yamazaki@tohmatsu.co.jp'

function parseArgs(argv) {
  const args = { attachments: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--subject') args.subject = argv[++i]
    else if (arg === '--body') args.body = argv[++i]
    else if (arg === '--body-file') args.body = fs.readFileSync(argv[++i], 'utf-8')
    else if (arg === '--attach') args.attachments.push(argv[++i])
    else {
      console.error(`不明な引数です: ${arg}`)
      process.exit(1)
    }
  }
  return args
}

const args = parseArgs(process.argv.slice(2))

if (!args.subject) {
  console.error('使い方: node send.mjs --subject "件名" [--body "本文" | --body-file path] [--attach path]...')
  process.exit(1)
}
if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.error('GMAIL_USER / GMAIL_APP_PASSWORD が .env に設定されていません(env.sampleを参照)')
  process.exit(1)
}
for (const filePath of args.attachments) {
  if (!fs.existsSync(filePath)) {
    console.error(`添付ファイルが見つかりません: ${filePath}`)
    process.exit(1)
  }
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

const info = await transporter.sendMail({
  from: process.env.GMAIL_USER,
  to: TO_ADDRESS,
  subject: args.subject,
  text: args.body ?? '',
  attachments: args.attachments.map((filePath) => ({ path: filePath })),
})

console.log(`送信しました: ${TO_ADDRESS} (messageId: ${info.messageId})`)
