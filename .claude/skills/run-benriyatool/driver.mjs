// benriyatoolをheadless Chromeで駆動するREPLドライバ。
// stdinから1行1コマンドを読み、結果をstdoutに出す。エージェントはheredocでスクリプトを流し込む。
// ブラウザはplaywright-core経由でシステムのGoogle Chrome(channel: 'chrome')を使う。
import { chromium } from 'playwright-core'
import { createInterface } from 'node:readline'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SHOTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'screenshots')
mkdirSync(SHOTS_DIR, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
// deviceScaleFactor: 2 で撮影解像度を上げる(要素単位のクローズアップ撮影で小さいアイコン等が
// 潰れて見えないのを防ぐため)
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })

// console.error / 未捕捉例外を貯めて `errors` コマンドで確認できるようにする
const errors = []
page.on('console', msg => { if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`) })
page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`))

// `text=...` はPlaywrightのテキストセレクタとしてそのまま渡せる
function loc(selector) {
  return page.locator(selector).first()
}

let shotCount = 0
async function run(line) {
  const [cmd, ...rest] = line.trim().split(/\s+/)
  const arg = rest.join(' ')
  switch (cmd) {
    case '':
      return
    case 'nav':
      await page.goto(arg, { waitUntil: 'load' })
      console.log(`ok nav ${page.url()}`)
      return
    case 'wait-for':
      await loc(arg).waitFor({ timeout: 15000 })
      console.log(`ok wait-for ${arg}`)
      return
    case 'click':
      await loc(arg).click()
      console.log(`ok click ${arg}`)
      return
    case 'fill': {
      // 第1トークンをセレクタ、残り全部を値として扱う(値に空白を含められる)
      const sel = rest[0]
      const value = rest.slice(1).join(' ')
      await loc(sel).fill(value)
      console.log(`ok fill ${sel}`)
      return
    }
    case 'press':
      await page.keyboard.press(arg)
      console.log(`ok press ${arg}`)
      return
    case 'screenshot': {
      const name = arg || `shot-${String(++shotCount).padStart(2, '0')}`
      const path = join(SHOTS_DIR, `${name}.png`)
      await page.screenshot({ path, fullPage: true })
      console.log(`ok screenshot ${path}`)
      return
    }
    case 'screenshot-el': {
      // 第1トークンをセレクタ、残りを名前として扱う。要素単位のクローズアップ撮影
      // (ビフォーアフター比較などフルページだと差分が見えにくい場合に使う)
      const sel = rest[0]
      const name = rest.slice(1).join(' ') || `el-${String(++shotCount).padStart(2, '0')}`
      const path = join(SHOTS_DIR, `${name}.png`)
      await loc(sel).screenshot({ path })
      console.log(`ok screenshot-el ${path}`)
      return
    }
    case 'text': {
      // 指定要素のテキストを表示(結果の数値検証に使う)
      console.log(await loc(arg).innerText())
      return
    }
    case 'eval':
      console.log(JSON.stringify(await page.evaluate(arg)))
      return
    case 'block':
      // 引数文字列をURLに含むリクエストを遮断する。スモークテストで本番Supabaseに
      // ゴミデータを書き込まないよう、通常は最初に `block supabase` を実行する
      await page.route(url => url.href.includes(arg), route => route.abort())
      console.log(`ok block ${arg}`)
      return
    case 'errors':
      console.log(errors.length ? errors.join('\n') : 'no errors')
      return
    case 'quit':
      await browser.close()
      process.exit(0)
      break
    default:
      console.log(`unknown command: ${cmd} (nav/wait-for/click/fill/press/screenshot/screenshot-el/text/eval/block/errors/quit)`)
  }
}

const rl = createInterface({ input: process.stdin })
for await (const line of rl) {
  try {
    await run(line)
  } catch (err) {
    // 1コマンドの失敗でREPL全体を落とさない(スクリプト実行時は後続の結果も見たい)
    console.log(`error: ${err.message.split('\n')[0]}`)
  }
}
await browser.close()
