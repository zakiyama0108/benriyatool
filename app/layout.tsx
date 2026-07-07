import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Footer from "./components/Footer";

const GA_MEASUREMENT_ID = "G-ZG600FMCS6";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://benriyatool.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "べんりやつーる | 暮らしのお金・手続きに役立つ無料ツール集",
  description: "暮らしのお金や手続きに関する無料ツールを提供しています。育休給付金シミュレーターをはじめ、今後も便利なツールを追加していきます。",
  openGraph: {
    title: "べんりやつーる | 暮らしのお金・手続きに役立つ無料ツール集",
    description: "暮らしのお金や手続きに関する無料ツールを提供しています。育休給付金シミュレーターをはじめ、今後も便利なツールを追加していきます。",
    url: SITE_URL,
    siteName: "べんりやつーる",
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        {children}
        <Footer />
      </body>
    </html>
  );
}
