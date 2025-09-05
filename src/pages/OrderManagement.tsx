import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Clock, CheckCircle, XCircle, ShoppingCart, Phone, User } from 'lucide-react';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  order_type: string;
  payment_method: string;
  total_amount: number;
  notes: string;
  created_at: string;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    special_instructions: string;
    menu_items: {
      name: string;
      preparation_time: number;
    };
  }[];
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  categories?: { name: string };
}

const OrderManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [newOrder, setNewOrder] = useState({
    customer_name: '',
    customer_phone: '',
    order_type: 'dine_in',
    payment_method: 'cash',
    notes: '',
    items: [] as { menu_item_id: string; quantity: number; special_instructions: string }[]
  });

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'preparing', label: 'Preparing', color: 'bg-blue-100 text-blue-800' },
    { value: 'ready', label: 'Ready', color: 'bg-green-100 text-green-800' },
    { value: 'completed', label: 'Completed', color: 'bg-green-200 text-green-900' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    if (profile?.canteen_id) {
      fetchData();
      setupRealtimeSubscription();
    }
  }, [profile]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const fetchData = async () => {
    if (!profile?.canteen_id) return;

    try {
      const [ordersResult, menuItemsResult] = await Promise.all([
        supabase
          .from('orders')
          .select(`
            *,
            order_items (
              id,
              quantity,
              unit_price,
              total_price,
              special_instructions,
              menu_items (
                name,
                preparation_time
              )
            )
          `)
          .eq('canteen_id', profile.canteen_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('menu_items')
          .select(`
            id,
            name,
            price,
            is_available,
            categories (name)
          `)
          .eq('canteen_id', profile.canteen_id)
          .eq('is_active', true)
          .eq('is_available', true)
      ]);

      if (ordersResult.data) setOrders(ordersResult.data);
      if (menuItemsResult.data) setMenuItems(menuItemsResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch orders"
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `canteen_id=eq.${profile?.canteen_id}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_phone?.includes(searchTerm) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          ...(newStatus === 'completed' && { served_by: profile?.user_id })
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`
      });

      fetchData();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update order status"
      });
    }
  };

  const handleCreateOrder = async () => {
    if (!profile?.canteen_id || newOrder.items.length === 0) return;

    try {
      // Calculate total amount
      const totalAmount = newOrder.items.reduce((sum, item) => {
        const menuItem = menuItems.find(mi => mi.id === item.menu_item_id);
        return sum + (menuItem?.price || 0) * item.quantity;
      }, 0);

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          canteen_id: profile.canteen_id,
          customer_name: newOrder.customer_name || null,
          customer_phone: newOrder.customer_phone || null,
          order_type: newOrder.order_type,
          payment_method: newOrder.payment_method,
          notes: newOrder.notes || null,
          total_amount: totalAmount,
          status: 'pending'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = newOrder.items.map(item => {
        const menuItem = menuItems.find(mi => mi.id === item.menu_item_id);
        return {
          order_id: orderData.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: menuItem?.price || 0,
          total_price: (menuItem?.price || 0) * item.quantity,
          special_instructions: item.special_instructions || null
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Order created successfully"
      });

      setNewOrder({
        customer_name: '',
        customer_phone: '',
        order_type: 'dine_in',
        payment_method: 'cash',
        notes: '',
        items: []
      });
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create order"
      });
    }
  };

  const addItemToOrder = () => {
    setNewOrder(prev => ({
      ...prev,
      items: [...prev.items, { menu_item_id: '', quantity: 1, special_instructions: '' }]
    }));
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeOrderItem = (index: number) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return (
      <Badge className={statusOption?.color}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  const calculateOrderTotal = () => {
    return newOrder.items.reduce((sum, item) => {
      const menuItem = menuItems.find(mi => mi.id === item.menu_item_id);
      return sum + (menuItem?.price || 0) * item.quantity;
    }, 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Order Management</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">Manage customer orders and track order status</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
              <DialogDescription>Add a new customer order</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer-name">Customer Name</Label>
                  <Input
                    id="customer-name"
                    value={newOrder.customer_name}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, customer_name: e.target.value }))}
                    placeholder="Customer name (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="customer-phone">Customer Phone</Label>
                  <Input
                    id="customer-phone"
                    value={newOrder.customer_phone}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, customer_phone: e.target.value }))}
                    placeholder="Phone number (optional)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Order Type</Label>
                  <Select
                    value={newOrder.order_type}
                    onValueChange={(value) => setNewOrder(prev => ({ ...prev, order_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dine_in">Dine In</SelectItem>
                      <SelectItem value="takeaway">Takeaway</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select
                    value={newOrder.payment_method}
                    onValueChange={(value) => setNewOrder(prev => ({ ...prev, payment_method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Order Items</Label>
                  <Button type="button" variant="outline" onClick={addItemToOrder}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {newOrder.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Select
                          value={item.menu_item_id}
                          onValueChange={(value) => updateOrderItem(index, 'menu_item_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {menuItems.map((menuItem) => (
                              <SelectItem key={menuItem.id} value={menuItem.id}>
                                {menuItem.name} - ₹{menuItem.price}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          placeholder="Qty"
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          value={item.special_instructions}
                          onChange={(e) => updateOrderItem(index, 'special_instructions', e.target.value)}
                          placeholder="Special instructions"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOrderItem(index)}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Order notes (optional)"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-lg font-semibold">
                  Total: ₹{calculateOrderTotal().toFixed(2)}
                </div>
                <Button
                  onClick={handleCreateOrder}
                  disabled={newOrder.items.length === 0}
                >
                  Create Order
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Orders</TabsTrigger>
          <TabsTrigger value="all">All Orders ({filteredOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrders
              .filter(order => ['pending', 'preparing', 'ready'].includes(order.status))
              .map((order) => (
                <Card key={order.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Order #{order.id.slice(-8).toUpperCase()}
                        </CardTitle>
                        <CardDescription>
                          {new Date(order.created_at).toLocaleString()}
                        </CardDescription>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {order.customer_name && (
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{order.customer_name}</span>
                      </div>
                    )}
                    {order.customer_phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{order.customer_phone}</span>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Items:</h4>
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.menu_items.name}</span>
                          <span>₹{item.total_price}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="font-semibold">Total: ₹{order.total_amount}</span>
                      <Badge variant="outline">{order.order_type}</Badge>
                    </div>

                    <div className="flex space-x-1">
                      {order.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(order.id, 'preparing')}
                        >
                          <Clock className="mr-1 h-3 w-3" />
                          Start
                        </Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(order.id, 'ready')}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Ready
                        </Button>
                      )}
                      {order.status === 'ready' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(order.id, 'completed')}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="all">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </CardTitle>
                      <CardDescription>
                        {new Date(order.created_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {order.customer_name || 'Walk-in Customer'}
                    </span>
                    <span className="font-medium">₹{order.total_amount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{order.order_items.length} items</span>
                    <span>{order.order_type}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No orders found</h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your filters' 
              : 'Create your first order to get started'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;