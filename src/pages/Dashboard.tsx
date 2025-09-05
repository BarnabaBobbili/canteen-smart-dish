import { useEffect, useState } from 'react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Clock,
  TrendingUp,
  Package,
  ChefHat,
  Star
} from 'lucide-react';

interface DashboardStats {
  total_revenue_month: number;
  total_orders_month: number;
  pending_orders_total: number;
  menu_items_total: number;
  revenue_growth_percentage: number;
  orders_growth_percentage: number;
  avg_order_value: number;
}

import { seedInitialData } from '@/lib/seeder';

const WelcomeSeeder = ({ profile, onSeed }: { profile: any, onSeed: () => Promise<void> }) => {
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    await onSeed();
    // The page will re-render, so no need to set loading to false.
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Welcome, {profile?.full_name || 'Owner'}!</CardTitle>
        <CardDescription>
          Your account is ready. Let's set up your first canteen with some sample data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Click the button below to generate a sample canteen, a complete menu with categories, and some recent order history. This will help you explore the features of the application immediately.
        </p>
        <Button onClick={handleSeed} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Sample Canteen'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};


const Dashboard = () => {
  const { profile, user, fetchUserProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [popularItems, setPopularItems] = useState<any[]>([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish

    if (profile?.canteen_id) {
      fetchDashboardData();
    } else {
      setIsDashboardLoading(false);
    }
  }, [profile, authLoading]);

  const fetchDashboardData = async () => {
    if (!profile?.canteen_id) return;
    try {
      const [statsResult, recentOrdersResult, popularItemsResult] = await Promise.all([
        supabase.rpc('get_dashboard_stats', { p_canteen_id: profile.canteen_id }),
        supabase
          .from('orders')
          .select('*, order_items (quantity, menu_items (name))')
          .eq('canteen_id', profile.canteen_id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.rpc('get_popular_items', { p_canteen_id: profile.canteen_id, p_limit: 5 })
      ]);

      if (statsResult.data) {
        setStats(statsResult.data[0]);
      }

      if (recentOrdersResult.data) {
        setRecentOrders(recentOrdersResult.data);
      }

      if (popularItemsResult.data) {
        setPopularItems(popularItemsResult.data);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsDashboardLoading(false);
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

  const handleSeedData = async () => {
    if (!user) return;
    const { success, error } = await seedInitialData(user);
    if (success) {
      toast({
        title: "Success!",
        description: "Your sample canteen has been created.",
      });
      await fetchUserProfile(user.id);
    } else {
      toast({
        variant: "destructive",
        title: "Seeding Failed",
        description: "Could not create sample data. Please check the console for errors.",
      });
    }
  };

  if (authLoading || isDashboardLoading) {
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

  if (profile?.role === 'owner' && !profile.canteen_id) {
    return profile ? <WelcomeSeeder profile={profile} onSeed={handleSeedData} /> : null;
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={`₹${stats?.total_revenue_month?.toLocaleString() || 0}`}
          description="Total earnings this month"
          icon={DollarSign}
          trend={{
            value: stats?.revenue_growth_percentage || 0,
            label: "from last month"
          }}
        />
        <StatsCard
          title="Total Orders"
          value={stats?.total_orders_month || 0}
          description="Orders this month"
          icon={ShoppingCart}
          trend={{
            value: stats?.orders_growth_percentage || 0,
            label: "from last month"
          }}
        />
        <StatsCard
          title="Pending Orders"
          value={stats?.pending_orders_total || 0}
          description="Orders awaiting preparation"
          icon={Clock}
        />
        <StatsCard
          title="Menu Items"
          value={stats?.menu_items_total || 0}
          description="Active menu items"
          icon={Package}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>Popular Items</span>
            </CardTitle>
            <CardDescription>Top 5 most ordered items this month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={popularItems} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }}
                  contentStyle={{
                    background: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Bar dataKey="order_count" name="Times Ordered" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
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