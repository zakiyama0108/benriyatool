import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Node 22+の実験的なグローバルlocalStorage(--localstorage-fileを渡さないと参照時に例外を投げる)が
// jsdom環境のセットアップより先にglobalThisへ存在するため、vitestのjsdom環境は
// 「populateGlobal」処理でlocalStorage/sessionStorageの上書きをスキップしてしまい、
// window.localStorageが常にundefinedになる(usage-guide機能の実装で発覚)。
// jsdom環境セットアップ時にglobal.jsdomへ積まれる実際のJSDOMインスタンスからlocalStorageを取り出し、
// globalThisへ明示的に上書きすることで、jsdomの正常なStorage実装を使えるようにする
const jsdomInstance = (globalThis as { jsdom?: { window?: { localStorage?: Storage } } }).jsdom
if (jsdomInstance?.window?.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: jsdomInstance.window.localStorage,
    configurable: true,
    writable: true,
  })
}

afterEach(() => {
  cleanup()
})
