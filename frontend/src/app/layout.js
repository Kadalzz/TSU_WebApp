import './globals.css';

export const metadata = {
  title: 'TSU WebApp',
  description: 'Smart Parts Pricing Assistant & Sales GPS',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
