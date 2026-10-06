import type { Metadata } from 'next';
import './globals.css';
import { AppLayout } from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'Malik Tasty Nashta Point - POS & Restaurant Management',
  description: 'Professional Restaurant POS & Management System for Malik Tasty Nashta Point, Hasilpur, Punjab, Pakistan',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full overflow-hidden select-none">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
