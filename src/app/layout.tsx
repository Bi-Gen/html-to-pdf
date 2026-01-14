import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HTML to PDF Converter | BI-Gen",
  description: "Converti pagine web in PDF. Supporta URL multipli e download ZIP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
