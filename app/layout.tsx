import type { ReactNode } from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

// Initialize font with optimized loading
const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
})

export const metadata: Metadata = {
  title: "Stream Pay - Ethereum Payment Streaming",
  description: "Create real-time, programmable payment streams on Ethereum",
  authors: [{ name: "Stream Pay Team" }],
  keywords: ["ethereum", "payments", "streaming", "blockchain", "web3"],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#3b82f6"
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
