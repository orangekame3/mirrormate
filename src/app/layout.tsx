import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MirrorMate",
  description: "Your friendly AI companion for smart mirror displays",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
