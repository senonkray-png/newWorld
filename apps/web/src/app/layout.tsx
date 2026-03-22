import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'СпівДія',
  description: 'Платформа кооператива для прямого обмена товарами и услугами.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
