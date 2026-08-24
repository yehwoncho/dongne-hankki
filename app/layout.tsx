import type { Metadata } from "next";
import { Inter, Public_Sans } from "next/font/google";
import "./globals.css";

// Stitch 디자인 시스템 폰트: headline/display/body = Inter, label = Public Sans
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "동네한끼 — 그 지역 식당 전체 목록",
  description:
    "광고도 순위도 없이, 시·도 → 시·군·구 → 카테고리 세 번의 선택만으로 그 지역 식당 전수 목록을 보여주는 서비스.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${inter.variable} ${publicSans.variable}`}>
      <head>
        {/* Material Symbols Outlined — Stitch 원본 화면의 아이콘 마크업을 그대로 쓰기 위한 아이콘 폰트 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-background font-body antialiased flex flex-col min-h-screen">
        {/* 로그인 위젯은 여기서 전역으로 그리지 않는다 — 헤더가 있는 페이지는 각자 헤더의
            flex 흐름 안에 <AuthWidget variant="inline" />를 넣고, 헤더가 없는 /memo만
            자체적으로 <AuthWidget />(fixed)를 띄운다. (기존 전역 fixed 방식은 홈 화면
            "내 주변" 링크와 겹치는 문제가 있었다.) */}
        {children}
      </body>
    </html>
  );
}
