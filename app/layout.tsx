import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-noto-sans-kr',
});

export const metadata: Metadata = {
  title: '경매 입찰가 계산기 | 부동산 매매사업자',
  description:
    '부동산 경매 입찰가 계산기. 매매사업자 기준 취득세, 종합소득세, 순수익까지 자동 계산. 역산 기능, 시나리오 분석, 레버리지 분석 제공.',
  keywords: '경매, 부동산, 입찰가, 계산기, 매매사업자, 취득세, 종합소득세',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body
        className={`${notoSansKR.variable} font-sans antialiased bg-slate-950 text-white`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
