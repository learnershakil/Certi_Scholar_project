import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'CertiScholar — Document Verification System',
  description:
    'Single-organization document intake, local Tesseract OCR, arithmetic consistency, and explainable scholarship eligibility.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[#08090a] text-[#f7f8f8] font-sans antialiased selection:bg-white/20 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
