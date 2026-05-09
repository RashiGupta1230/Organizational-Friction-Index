import { ClerkProvider } from '@clerk/nextjs';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'Org X-Ray - OFI Analyzer',
  description: 'Enterprise organizational management web app',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" className={jakarta.className}>
        <body className="antialiased selection:bg-[#0D9488]/30 selection:text-[#0F766E]">{children}</body>
      </html>
    </ClerkProvider>
  );
}
