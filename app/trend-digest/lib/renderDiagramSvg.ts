// 図解(概念図)をAI画像生成ではなくコードで直接SVG描画する(仕様: content-generation/
// requirements.md#図解-17)。エージェントは自由文プロンプトではなく、固定のアイコン名([[diagramIcons]])
// と短い日本語ラベルを含む構造化データ(DiagramSpec)を返し、ここで決定的にSVGへ変換する。
// 文字はSVGの<text>要素(実フォント)で描画するため、AI画像生成モデルが苦手な文章の正確な
// 再現という問題が構造的に起きない(2026-10改定。根拠: 運営者フィードバック「想定している
// 画像のアウトプットとまるで違う。説明内容の概略図とか、理解が難しい部分の補助的材料となる
// 画像を作ってほしい」「無料で使えるAIで文字入りの図は作れない」)
import { DIAGRAM_ICON_PATHS, type DiagramIconName } from './diagramIcons'

export type DiagramItem = {
  icon: DiagramIconName
  label: string // 短い日本語ラベル(目安10字程度まで。長い場合は自動的に2行に折り返す)
}

export type StepsDiagramSpec = {
  layout: 'steps' // 複数のアイコンを矢印でつなぐ、手順・流れを示すレイアウト
  items: DiagramItem[] // 2〜4件を想定
}

export type CompareDiagramSpec = {
  layout: 'compare' // 2つのアイコンを対比させる、比較・対比を示すレイアウト
  left: DiagramItem
  right: DiagramItem
}

export type DiagramSpec = StepsDiagramSpec | CompareDiagramSpec

const COLORS = ['#0d9488', '#2563eb', '#ea580c', '#db2777'] // teal/blue/orange/pinkの順で各アイコンに割り当てる(news-digest系アプリのアクセントカラーと合わせる)
const ICON_RADIUS = 36
const ITEM_WIDTH = 180
const CANVAS_HEIGHT = 200
const CENTER_Y = 80

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// 長いラベルを2行までに折り返す(日本語は1文字単位で区切ってよいため、文字数ベースで単純に折り返す)
function wrapLabel(label: string, maxCharsPerLine = 9, maxLines = 2): string[] {
  const chars = Array.from(label)
  const lines: string[] = []
  for (let i = 0; i < chars.length && lines.length < maxLines; i += maxCharsPerLine) {
    lines.push(chars.slice(i, i + maxCharsPerLine).join(''))
  }
  const consumed = Math.min(chars.length, maxCharsPerLine * maxLines)
  if (consumed < chars.length) {
    lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1) + '…'
  }
  return lines
}

function renderIconCircle(cx: number, cy: number, icon: DiagramIconName, color: string): string {
  // fill-rule="evenodd"を常に指定する(Heroiconsの元データは一部のパスのみclip-rule="evenodd"を
  // 持つが、1パス=1つの閉じた単純な領域であればevenodd/nonzeroの結果は一致するため、
  // ドーナツ状のアイコン(clock・shield-check等)が中抜きされずに塗りつぶされる事故を避けるため
  // 全パスに一律で指定する)
  const paths = DIAGRAM_ICON_PATHS[icon].map((d) => `<path d="${d}" fill="#ffffff" fill-rule="evenodd"/>`).join('')
  return `<circle cx="${cx}" cy="${cy}" r="${ICON_RADIUS}" fill="${color}"/><g transform="translate(${cx},${cy}) scale(1.6) translate(-12,-12)">${paths}</g>`
}

function renderLabel(cx: number, topY: number, label: string): string {
  const lines = wrapLabel(label)
  return lines
    .map(
      (line, i) =>
        `<text x="${cx}" y="${topY + i * 20}" text-anchor="middle" font-size="15" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif" fill="#374151">${escapeXml(line)}</text>`
    )
    .join('')
}

function renderArrow(fromX: number, toX: number, y: number, color: string): string {
  return `<line x1="${fromX}" y1="${y}" x2="${toX - 10}" y2="${y}" stroke="${color}" stroke-width="3" stroke-linecap="round"/><polygon points="${toX - 10},${y - 7} ${toX},${y} ${toX - 10},${y + 7}" fill="${color}"/>`
}

// DiagramSpecからSVG文字列(そのままcontent/<app>/articles/images/配下に保存するファイルの中身)を組み立てる
export function renderDiagramSvg(spec: DiagramSpec): string {
  if (spec.layout === 'steps') {
    const n = spec.items.length
    const width = ITEM_WIDTH * n
    const parts = spec.items.map((item, i) => {
      const cx = ITEM_WIDTH * i + ITEM_WIDTH / 2
      const color = COLORS[i % COLORS.length]
      let svg = renderIconCircle(cx, CENTER_Y, item.icon, color)
      svg += renderLabel(cx, CENTER_Y + ICON_RADIUS + 28, item.label)
      if (i < n - 1) {
        const nextCx = ITEM_WIDTH * (i + 1) + ITEM_WIDTH / 2
        svg += renderArrow(cx + ICON_RADIUS + 6, nextCx - ICON_RADIUS - 6, CENTER_Y, '#9ca3af')
      }
      return svg
    })
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${CANVAS_HEIGHT}" width="${width}" height="${CANVAS_HEIGHT}">${parts.join('')}</svg>`
  }

  // compare: 左右2項目を中央の区切り線で対比させる
  const width = ITEM_WIDTH * 2
  const leftCx = ITEM_WIDTH / 2
  const rightCx = ITEM_WIDTH * 1.5
  let svg = renderIconCircle(leftCx, CENTER_Y, spec.left.icon, COLORS[0])
  svg += renderLabel(leftCx, CENTER_Y + ICON_RADIUS + 28, spec.left.label)
  svg += renderIconCircle(rightCx, CENTER_Y, spec.right.icon, COLORS[2])
  svg += renderLabel(rightCx, CENTER_Y + ICON_RADIUS + 28, spec.right.label)
  svg += `<line x1="${width / 2}" y1="20" x2="${width / 2}" y2="${CANVAS_HEIGHT - 20}" stroke="#e5e7eb" stroke-width="2" stroke-dasharray="6,6"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${CANVAS_HEIGHT}" width="${width}" height="${CANVAS_HEIGHT}">${svg}</svg>`
}
