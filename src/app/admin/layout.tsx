import '../globals.css';

export const metadata = {
  title: 'Rhapsody Crusades Admin',
  description: 'Admin panel for Rhapsody Crusades App',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen">{children}</body>
    </html>
  );
}
