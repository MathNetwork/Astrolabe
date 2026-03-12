import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NetMath",
  description: "NetMath: Math Knowledge Network",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
