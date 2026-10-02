import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { Toaster } from 'sonner';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LeadDesk — Modern Sales Lead Management',
  description: 'Role-based sales lead tracking and administration platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${inter.variable}`}>
      <body>
        <AuthProvider>
          <div className="app-layout">
            <Suspense fallback={null}>
              <Header />
            </Suspense>
            {children}
          </div>
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}
