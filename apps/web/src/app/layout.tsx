import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'СпівДія',
  description: 'Платформа кооператива для прямого обмена товарами и услугами.',
};

const themeScript = `(function(){try{var d=localStorage.getItem('nm-dark-theme');if(d!=='1')document.documentElement.classList.add('nm-light')}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
