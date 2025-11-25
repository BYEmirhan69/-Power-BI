import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Power BI Platform | İş Zekası Çözümleri",
  description:
    "Firmaların kendi veri kaynaklarını kullanarak zaman serisi, tüketici davranışları ve teknoloji kullanımı gibi verileri görselleştirebilecekleri modüler ve ölçeklenebilir iş zekası platformu.",
  keywords: [
    "iş zekası",
    "business intelligence",
    "veri görselleştirme",
    "dashboard",
    "analitik",
    "raporlama",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
