import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Magic Mirror AI",
  description: "SF-style Magic Mirror with AI Assistant",
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
