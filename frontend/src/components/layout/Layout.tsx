import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-tg-bg text-tg-text">
      <main className="flex-1 p-4">
        {children}
      </main>
    </div>
  );
}

export default Layout;
