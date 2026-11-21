import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { GOOGLE_FONTS_URL } from "@/lib/presets";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slate — Visual Design Studio",
  description:
    "Create presentations, social graphics, posters, edited photos, brand kits, and vector logos in Slate.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      </head>
      <body className="min-h-dvh antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
