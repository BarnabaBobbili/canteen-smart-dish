import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { useAuth } from '@/hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile } = useAuth();

  // A new owner who hasn't seeded their canteen yet should not see the sidebar.
  // This guides them to complete the setup on the dashboard.
  const showSidebar = !(profile?.role === 'owner' && !profile.canteen_id);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {showSidebar && <AppSidebar />}
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}