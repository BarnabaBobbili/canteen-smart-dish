import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Package, Tag, Search } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  is_active: boolean;
  is_available: boolean;
  preparation_time: number;
  image_url: string;
  categories?: { name: string };
}

const MenuManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    is_active: true
  });

  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    description: '',
    price: 0,
    category_id: '',
    is_active: true,
    is_available: true,
    preparation_time: 0,
    image_url: ''
  });

  useEffect(() => {
    console.log("MenuManagement profile:", profile);
    if (profile?.canteen_id) {
      console.log("MenuManagement: Canteen ID found, fetching data...");
      fetchData();
    } else {
      console.log("MenuManagement: No Canteen ID found.");
    }
  }, [profile]);

  useEffect(() => {
    filterMenuItems();
  }, [menuItems, searchTerm, selectedCategory]);

  const fetchData = async () => {
    if (!profile?.canteen_id) return;

    try {
      const [categoriesResult, menuItemsResult] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('canteen_id', profile.canteen_id)
          .order('name'),
        supabase
          .from('menu_items')
          .select(`
            *,
            categories (name)
          `)
          .eq('canteen_id', profile.canteen_id)
          .order('name')
      ]);

      if (categoriesResult.data) setCategories(categoriesResult.data);
      if (menuItemsResult.data) setMenuItems(menuItemsResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch menu data"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterMenuItems = () => {
    let filtered = menuItems;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category_id === selectedCategory);
    }

    setFilteredItems(filtered);
  };

  const handleCreateCategory = async () => {
    if (!profile?.canteen_id || !newCategory.name) return;

    try {
      const { error } = await supabase
        .from('categories')
        .insert([{
          ...newCategory,
          canteen_id: profile.canteen_id
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category created successfully"
      });

      setNewCategory({ name: '', description: '', is_active: true });
      setCategoryDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create category"
      });
    }
  };

  const handleCreateMenuItem = async () => {
    if (!profile?.canteen_id || !newMenuItem.name || !newMenuItem.category_id) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .insert([{
          ...newMenuItem,
          canteen_id: profile.canteen_id
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Menu item created successfully"
      });

      setNewMenuItem({
        name: '',
        description: '',
        price: 0,
        category_id: '',
        is_active: true,
        is_available: true,
        preparation_time: 0,
        image_url: ''
      });
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating menu item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create menu item"
      });
    }
  };

  const handleUpdateMenuItem = async () => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .update(newMenuItem)
        .eq('id', editingItem.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Menu item updated successfully"
      });

      setEditingItem(null);
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error updating menu item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update menu item"
      });
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Menu item deleted successfully"
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete menu item"
      });
    }
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setNewMenuItem({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category_id: item.category_id || '',
      is_active: item.is_active,
      is_available: item.is_available,
      preparation_time: item.preparation_time || 0,
      image_url: item.image_url || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setNewMenuItem({
      name: '',
      description: '',
      price: 0,
      category_id: '',
      is_active: true,
      is_available: true,
      preparation_time: 0,
      image_url: ''
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Menu Management</h1>
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
          <h1 className="text-3xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground">Manage your menu categories and items</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogDescription>Add a new category to organize your menu items</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category-name">Name</Label>
                  <Input
                    id="category-name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Category name"
                  />
                </div>
                <div>
                  <Label htmlFor="category-description">Description</Label>
                  <Textarea
                    id="category-description"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Category description"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newCategory.is_active}
                    onCheckedChange={(checked) => setNewCategory(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label>Active</Label>
                </div>
                <Button onClick={handleCreateCategory} className="w-full">
                  Create Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Menu Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Create New Menu Item'}</DialogTitle>
                <DialogDescription>
                  {editingItem ? 'Update the menu item details' : 'Add a new item to your menu'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="item-name">Name *</Label>
                    <Input
                      id="item-name"
                      value={newMenuItem.name}
                      onChange={(e) => setNewMenuItem(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Item name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="item-price">Price (₹) *</Label>
                    <Input
                      id="item-price"
                      type="number"
                      step="0.01"
                      value={newMenuItem.price}
                      onChange={(e) => setNewMenuItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="item-category">Category *</Label>
                  <Select
                    value={newMenuItem.category_id}
                    onValueChange={(value) => setNewMenuItem(prev => ({ ...prev, category_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="item-description">Description</Label>
                  <Textarea
                    id="item-description"
                    value={newMenuItem.description}
                    onChange={(e) => setNewMenuItem(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Item description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prep-time">Preparation Time (minutes)</Label>
                    <Input
                      id="prep-time"
                      type="number"
                      value={newMenuItem.preparation_time}
                      onChange={(e) => setNewMenuItem(prev => ({ ...prev, preparation_time: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="image-url">Image URL</Label>
                    <Input
                      id="image-url"
                      value={newMenuItem.image_url}
                      onChange={(e) => setNewMenuItem(prev => ({ ...prev, image_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newMenuItem.is_active}
                      onCheckedChange={(checked) => setNewMenuItem(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label>Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newMenuItem.is_available}
                      onCheckedChange={(checked) => setNewMenuItem(prev => ({ ...prev, is_available: checked }))}
                    />
                    <Label>Available</Label>
                  </div>
                </div>
                <Button
                  onClick={editingItem ? handleUpdateMenuItem : handleCreateMenuItem}
                  className="w-full"
                  disabled={!newMenuItem.name || !newMenuItem.category_id}
                >
                  {editingItem ? 'Update Item' : 'Create Item'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Menu Items ({filteredItems.length})</TabsTrigger>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <Card key={item.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {item.description}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteMenuItem(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">₹{item.price}</span>
                    <Badge variant={item.is_available ? "default" : "secondary"}>
                      {item.is_available ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{item.categories?.name}</span>
                    {item.preparation_time > 0 && (
                      <span>{item.preparation_time} min</span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Badge variant={item.is_active ? "outline" : "secondary"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No menu items found</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Create your first menu item to get started'
                }
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {category.name}
                    <Badge variant={category.is_active ? "default" : "secondary"}>
                      {category.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {menuItems.filter(item => item.category_id === category.id).length} items
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MenuManagement;