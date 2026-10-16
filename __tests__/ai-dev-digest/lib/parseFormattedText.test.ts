import { describe, it, expect } from 'vitest'
import { parseFormattedText, parseInline } from '../../../app/ai-dev-digest/lib/parseFormattedText'

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-15
describe('parseInline', () => {
  it('前後に通常テキストがない場合、単一のtextノードを返すこと', () => {
    expect(parseInline('ただの文章です')).toEqual([{ type: 'text', text: 'ただの文章です' }])
  })

  it('`code`記法をcodeノードとして抽出すること', () => {
    expect(parseInline('コマンド`npm install`を実行する')).toEqual([
      { type: 'text', text: 'コマンド' },
      { type: 'code', text: 'npm install' },
      { type: 'text', text: 'を実行する' },
    ])
  })

  it('[text](url)記法をlinkノードとして抽出すること', () => {
    expect(parseInline('詳細は[公式ドキュメント](https://example.com/docs)を参照')).toEqual([
      { type: 'text', text: '詳細は' },
      { type: 'link', text: '公式ドキュメント', href: 'https://example.com/docs' },
      { type: 'text', text: 'を参照' },
    ])
  })

  it('codeとlinkが混在する場合、両方を順番に抽出すること', () => {
    expect(parseInline('`a`から[b](https://example.com)へ')).toEqual([
      { type: 'code', text: 'a' },
      { type: 'text', text: 'から' },
      { type: 'link', text: 'b', href: 'https://example.com' },
      { type: 'text', text: 'へ' },
    ])
  })
})

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-15
describe('parseFormattedText', () => {
  it('空行区切りの2段落を別々のparagraphブロックにすること', () => {
    const blocks = parseFormattedText('1段落目\n\n2段落目')
    expect(blocks).toEqual([
      { type: 'paragraph', inline: [{ type: 'text', text: '1段落目' }] },
      { type: 'paragraph', inline: [{ type: 'text', text: '2段落目' }] },
    ])
  })

  it('改行のみ(空行なし)の段落は1つのparagraphに連結されること', () => {
    const blocks = parseFormattedText('1行目\n2行目')
    expect(blocks).toEqual([{ type: 'paragraph', inline: [{ type: 'text', text: '1行目 2行目' }] }])
  })

  it('「1. 」形式の連続行をorderedListとしてまとめること', () => {
    const blocks = parseFormattedText('手順:\n1. 最初の手順\n2. 次の手順\n3. 最後の手順')
    expect(blocks).toEqual([
      { type: 'paragraph', inline: [{ type: 'text', text: '手順:' }] },
      {
        type: 'orderedList',
        items: [
          [{ type: 'text', text: '最初の手順' }],
          [{ type: 'text', text: '次の手順' }],
          [{ type: 'text', text: '最後の手順' }],
        ],
      },
    ])
  })

  it('「- 」形式の連続行をunorderedListとしてまとめること', () => {
    const blocks = parseFormattedText('- りんご\n- みかん')
    expect(blocks).toEqual([
      {
        type: 'unorderedList',
        items: [[{ type: 'text', text: 'りんご' }], [{ type: 'text', text: 'みかん' }]],
      },
    ])
  })

  it('```で囲まれた範囲をcodeブロックとして抽出すること(前後の装飾は含めない)', () => {
    const blocks = parseFormattedText('設定例:\n```\n{"a": 1}\n```\n以上です')
    expect(blocks).toEqual([
      { type: 'paragraph', inline: [{ type: 'text', text: '設定例:' }] },
      { type: 'code', code: '{"a": 1}' },
      { type: 'paragraph', inline: [{ type: 'text', text: '以上です' }] },
    ])
  })

  it('複数行のcodeブロックをそのまま改行付きで保持すること', () => {
    const blocks = parseFormattedText('```\nline1\nline2\n```')
    expect(blocks).toEqual([{ type: 'code', code: 'line1\nline2' }])
  })

  it('段落・リスト・コードブロックが混在する詳細文を順序通りに分解すること', () => {
    const text = '今すぐ試せます。\n1. 設定ファイルを作る\n2. 値を書く\n```\nkey: value\n```\n詳しくは[公式](https://example.com)へ'
    const blocks = parseFormattedText(text)
    expect(blocks).toEqual([
      { type: 'paragraph', inline: [{ type: 'text', text: '今すぐ試せます。' }] },
      {
        type: 'orderedList',
        items: [[{ type: 'text', text: '設定ファイルを作る' }], [{ type: 'text', text: '値を書く' }]],
      },
      { type: 'code', code: 'key: value' },
      {
        type: 'paragraph',
        inline: [{ type: 'text', text: '詳しくは' }, { type: 'link', text: '公式', href: 'https://example.com' }, { type: 'text', text: 'へ' }],
      },
    ])
  })

  it('空文字列の場合、空配列を返すこと', () => {
    expect(parseFormattedText('')).toEqual([])
  })

  // コードブロックで中断された番号付き手順は、再開後も元の番号から続くこと
  // (例: 1. 2. (コード) 3. のように番号が1.に戻って表示上の段数と食い違わない)
  // 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-15
  it('コードブロックで中断された番号付きリストは、再開後の番号(数字)をstartとして保持すること', () => {
    const blocks = parseFormattedText('1. 最初の手順\n2. 次の手順\n```\nnpm install\n```\n3. 最後の手順')
    expect(blocks).toEqual([
      {
        type: 'orderedList',
        items: [[{ type: 'text', text: '最初の手順' }], [{ type: 'text', text: '次の手順' }]],
      },
      { type: 'code', code: 'npm install' },
      {
        type: 'orderedList',
        items: [[{ type: 'text', text: '最後の手順' }]],
        start: 3,
      },
    ])
  })
})
