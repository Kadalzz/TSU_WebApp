import { Roboto } from 'next/font/google';
import './globals.css';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
});

export const metadata = {
  title: 'TSU WebApp',
  description: 'Smart Parts Pricing Assistant & Sales GPS',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={roboto.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans">{children}</body>
    </html>
  );
}
