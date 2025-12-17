import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vibe Coding Wheel",
  description: "Внутреннее приложение для выбора проектов в игровой форме",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={inter.className}>
      <body className={`${inter.className} ${inter.variable} antialiased`}>
        {/* Снежинки */}
        <div className="snowflakes" aria-hidden="true">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="snowflake"
              style={{
                left: `${Math.random() * 100}%`,
                animationDuration: `${Math.random() * 3 + 8}s`,
                animationDelay: `${Math.random() * 5}s`,
                fontSize: `${Math.random() * 10 + 10}px`,
                opacity: Math.random() * 0.5 + 0.3,
              }}
            >
              ❄
            </div>
          ))}
        </div>
        
        {/* Новогодняя гирлянда */}
        <div className="christmas-lights" aria-hidden="true">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="light" />
          ))}
        </div>

        <div className="app-layout">
          {children}
        </div>
      </body>
    </html>
  );
}
