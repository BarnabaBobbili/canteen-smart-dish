import { useEffect, useState } from 'react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Clock,
  TrendingUp,
  Package,
  ChefHat
} from 'lucide-react';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  menuItems: number;
  revenueGrowth: number;
  ordersGrowth: number;
}

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    menuItems: 0,
    revenueGrowth: 0,
    ordersGrowth: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.canteen_id) {
      fetchDashboardData();
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile?.canteen_id) return;

    try {
      // Fetch orders for stats
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('canteen_id', profile.canteen_id);

      // Fetch menu items count
      const { data: menuItems } = await supabase
        .from('menu_items')
        .select('id')
        .eq('canteen_id', profile.canteen_id)
        .eq('is_active', true);

      // Fetch recent orders with details
      const { data: recentOrdersData } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            menu_items (name)
          )
        `)
        .eq('canteen_id', profile.canteen_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (orders) {
        const totalRevenue = orders
          .filter(order => order.status === 'completed')
          .reduce((sum, order) => sum + Number(order.total_amount), 0);

        const pendingOrders = orders.filter(order =>
          ['pending', 'preparing'].includes(order.status)
        ).length;

        setStats({
          totalRevenue,
          totalOrders: orders.length,
          pendingOrders,
          menuItems: menuItems?.length || 0,
          revenueGrowth: 12.5, // Mock data
          ordersGrowth: 8.2, // Mock data
        });
      }

      if (recentOrdersData) {
        setRecentOrders(recentOrdersData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'preparing': return 'text-blue-600 bg-blue-50';
      case 'ready': return 'text-green-600 bg-green-50';
      case 'completed': return 'text-green-700 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name}
          </p>
        </div>
      </div>

      {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          description="Total earnings this month"
          icon={DollarSign}
          trend={{
            value: stats.revenueGrowth,
            label: "from last month"
          }}
        />
        <StatsCard
          title="Total Orders"
          value={stats.totalOrders}
          description="Orders processed"
          icon={ShoppingCart}
          trend={{
            value: stats.ordersGrowth,
            label: "from last month"
          }}
        />
        <StatsCard
          title="Pending Orders"
          value={stats.pendingOrders}
          description="Orders awaiting preparation"
          icon={Clock}
        />
        <StatsCard
          title="Menu Items"
          value={stats.menuItems}
          description="Active menu items"
          icon={Package}
        />
      </div> */}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Quick Stats</span>
            </CardTitle>
            <CardDescription>
              Key performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Average Order Value</span>
              <span className="font-medium">
                ₹{stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toFixed(2) : '0'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Completion Rate</span>
              <span className="font-medium">95%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Customer Satisfaction</span>
              <span className="font-medium">4.8/5</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ChefHat className="h-5 w-5" />
              <span>Recent Orders</span>
            </CardTitle>
            <CardDescription>
              Latest customer orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {order.customer_name || 'Walk-in Customer'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.order_items?.reduce((total: number, item: any) => total + item.quantity, 0)} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">₹{Number(order.total_amount).toFixed(2)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent orders
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;