import type { Metadata } from "next";
import "@fontsource/stix-two-text/400.css";
import "@fontsource/stix-two-text/500.css";
import "@fontsource/stix-two-text/600.css";
import "@fontsource/stix-two-text/700.css";
import "@fontsource/stix-two-text/400-italic.css";
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
