import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "North Star Partners | People-Centered Consulting",
    template: "%s | North Star Partners",
  },
  description:
    "Custom employee experience solutions — culture surveys, leadership development, sentiment analysis, and actionable reporting for organizations that invest in their people.",
  keywords: [
    "employee experience",
    "culture survey",
    "leadership development",
    "sentiment analysis",
    "organizational consulting",
    "employee engagement",
  ],
  openGraph: {
    type: "website",
    siteName: "North Star Partners",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="min-h-screen bg-surface-2 font-sans text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
