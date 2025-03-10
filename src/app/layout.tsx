import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// u6dfbu52a0u65e5u8a8cu4ee5u9a57u8b49 CSS u8f09u5165
console.log('[u6e2cu8a66] u5728 layout.tsx u4e2du8f09u5165 globals.css');

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FileChat - Transform the Way You Interact with Your Files",
  description: "Upload, manage, and chat with your files in a seamless, intuitive environment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // u6dfbu52a0u65e5u8a8cu4ee5u9a57u8b49 shadcn u985eu540d
  console.log('[u6e2cu8a66] RootLayout u6e32u67d3');
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head />

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <div className="debug-info" style={{ position: 'fixed', top: 0, right: 0, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '5px', zIndex: 9999, fontSize: '12px' }}>
          CSS u6e2cu8a66 | u5982u679cu4f60u770bu5230u9019u500bu6587u5b57uff0cCSS u57fau672cu8f09u5165u6210u529f
        </div>
        {children}
      </body>
    </html>
  );
}
