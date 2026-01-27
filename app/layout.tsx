import type { Metadata } from "next";
import { Geist, Geist_Mono, Shadows_Into_Light, DM_Sans, Itim } from "next/font/google";
import "./globals.css";
import StyledComponentsRegistry from "../frontend/components/styled/StyledComponentsRegistry";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const shadowsIntoLight = Shadows_Into_Light({
  variable: "--font-shadows-into-light",
  subsets: ["latin"],
  weight: "400",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const itim = Itim({
  variable: "--font-itim",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trivia Game",
  description: "Create and join trivia games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${shadowsIntoLight.variable} ${dmSans.variable} ${itim.variable} antialiased`}
      >
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
