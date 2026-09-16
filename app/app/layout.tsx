import '../globals.css';
export const metadata = { title: 'EDIT-IA', description: 'Mobile AI video edit experience' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
