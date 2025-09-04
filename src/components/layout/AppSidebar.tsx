import { 
  Home, 
  Users, 
  MenuSquare, 
  ShoppingCart, 
  Package, 
  Percent, 
  CreditCard, 
  BarChart3, 
  MessageSquare,
  Settings,
  ChefHat
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: Home, roles: ['owner', 'manager', 'cashier', 'chef', 'inventory_handler'] },
  { title: 'Staff Management', url: '/staff', icon: Users, roles: ['owner', 'manager'] },
  { title: 'Menu Management', url: '/menu', icon: MenuSquare, roles: ['owner', 'manager', 'chef'] },
  { title: 'Orders', url: '/orders', icon: ShoppingCart, roles: ['owner', 'manager', 'cashier'] },
  { title: 'Inventory', url: '/inventory', icon: Package, roles: ['owner', 'manager', 'inventory_handler'] },
  { title: 'Discounts', url: '/discounts', icon: Percent, roles: ['owner', 'manager'] },
  { title: 'Billing', url: '/billing', icon: CreditCard, roles: ['owner', 'manager', 'cashier'] },
  { title: 'Reports', url: '/reports', icon: BarChart3, roles: ['owner', 'manager'] },
  { title: 'Feedback', url: '/feedback', icon: MessageSquare, roles: ['owner', 'manager'] },
  { title: 'Settings', url: '/settings', icon: Settings, roles: ['owner', 'manager'] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile } = useAuth();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'hover:bg-sidebar-accent/50';

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  );

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-60'} collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-2">
            <ChefHat className="h-6 w-6 text-sidebar-primary" />
            {!collapsed && (
              <div>
                <h2 className="font-semibold text-sidebar-foreground">CMS</h2>
                <p className="text-xs text-sidebar-foreground/70">Canteen Management</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && profile && (
          <div className="mt-auto p-4 border-t border-sidebar-border">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center">
                <span className="text-xs font-medium text-sidebar-primary-foreground">
                  {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile.full_name}
                </p>
                <p className="text-xs text-sidebar-foreground/70 capitalize">
                  {profile.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}