import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Starlog — 사진에서 블로그 초안까지",
  description: "사진과 메모의 맥락은 살리고 필요한 정보는 확인해, 내 문체의 네이버 블로그 초안으로 완성합니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
