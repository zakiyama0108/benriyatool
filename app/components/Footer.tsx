import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-white py-6 text-center text-xs text-gray-400">
      <div className="flex justify-center gap-6 mb-3">
        <Link href="/legal#terms" className="hover:text-gray-600 transition-colors">
          利用規約
        </Link>
        <Link href="/legal#privacy" className="hover:text-gray-600 transition-colors">
          プライバシーポリシー
        </Link>
      </div>
      <p>© 2026 べんりやつーる</p>
    </footer>
  )
}
