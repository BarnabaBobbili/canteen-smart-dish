import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Users, Mail, Phone, UserCheck, UserX } from 'lucide-react';

interface StaffMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  avatar_url: string;
  created_at: string;
  canteens?: {
    name: string;
  };
}

const StaffManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [newStaff, setNewStaff] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'cashier',
    is_active: true
  });

  const roleOptions = [
    { value: 'owner', label: 'Owner', description: 'Full system access' },
    { value: 'manager', label: 'Manager', description: 'Staff and operations management' },
    { value: 'cashier', label: 'Cashier', description: 'Order processing and billing' },
    { value: 'chef', label: 'Chef', description: 'Menu and kitchen management' },
    { value: 'inventory_handler', label: 'Inventory Handler', description: 'Stock management' }
  ];

  useEffect(() => {
    if (profile?.canteen_id) {
      fetchStaffMembers();
    }
  }, [profile]);

  useEffect(() => {
    filterStaffMembers();
  }, [staffMembers, searchTerm, roleFilter]);

  const fetchStaffMembers = async () => {
    if (!profile?.canteen_id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          canteens (name)
        `)
        .eq('canteen_id', profile.canteen_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setStaffMembers(data);
      }
    } catch (error) {
      console.error('Error fetching staff members:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch staff members"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterStaffMembers = () => {
    let filtered = staffMembers;

    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.phone?.includes(searchTerm)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter);
    }

    setFilteredStaff(filtered);
  };

  const handleInviteStaff = async () => {
    if (!profile?.canteen_id || !newStaff.email || !newStaff.full_name) return;

    try {
      // In a real implementation, you would send an invitation email
      // For now, we'll just create a profile entry
      const { error } = await supabase
        .from('profiles')
        .insert([{
          ...newStaff,
          canteen_id: profile.canteen_id,
          user_id: `temp_${Date.now()}`, // Temporary ID until user accepts invite
          role: newStaff.role as 'owner' | 'manager' | 'cashier' | 'chef' | 'inventory_handler'
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Staff invitation sent successfully"
      });

      setNewStaff({
        full_name: '',
        email: '',
        phone: '',
        role: 'cashier',
        is_active: true
      });
      setDialogOpen(false);
      fetchStaffMembers();
    } catch (error) {
      console.error('Error inviting staff:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send staff invitation"
      });
    }
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: newStaff.role as 'owner' | 'manager' | 'cashier' | 'chef' | 'inventory_handler',
          is_active: newStaff.is_active,
          phone: newStaff.phone
        })
        .eq('id', editingStaff.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Staff member updated successfully"
      });

      setEditingStaff(null);
      setDialogOpen(false);
      fetchStaffMembers();
    } catch (error) {
      console.error('Error updating staff:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update staff member"
      });
    }
  };

  const handleToggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', staffId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Staff member ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      });

      fetchStaffMembers();
    } catch (error) {
      console.error('Error toggling staff status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update staff status"
      });
    }
  };

  const openEditDialog = (member: StaffMember) => {
    setEditingStaff(member);
    setNewStaff({
      full_name: member.full_name,
      email: member.email,
      phone: member.phone || '',
      role: member.role,
      is_active: member.is_active
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingStaff(null);
    setNewStaff({
      full_name: '',
      email: '',
      phone: '',
      role: 'cashier',
      is_active: true
    });
  };

  const getRoleColor = (role: string) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      cashier: 'bg-green-100 text-green-800',
      chef: 'bg-orange-100 text-orange-800',
      inventory_handler: 'bg-gray-100 text-gray-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Staff Management</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Check if user has permission to manage staff
  if (!['owner', 'manager'].includes(profile?.role || '')) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Access Denied</h3>
        <p className="text-muted-foreground">
          You don't have permission to manage staff members
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">Manage your canteen staff and their roles</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Invite Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStaff ? 'Edit Staff Member' : 'Invite New Staff Member'}
              </DialogTitle>
              <DialogDescription>
                {editingStaff 
                  ? 'Update the staff member details and permissions'
                  : 'Send an invitation to join your canteen team'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="staff-name">Full Name *</Label>
                <Input
                  id="staff-name"
                  value={newStaff.full_name}
                  onChange={(e) => setNewStaff(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter full name"
                  disabled={!!editingStaff}
                />
              </div>
              <div>
                <Label htmlFor="staff-email">Email *</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  disabled={!!editingStaff}
                />
              </div>
              <div>
                <Label htmlFor="staff-phone">Phone</Label>
                <Input
                  id="staff-phone"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="staff-role">Role *</Label>
                <Select
                  value={newStaff.role}
                  onValueChange={(value) => setNewStaff(prev => ({ ...prev, role: value }))}
                  disabled={editingStaff?.role === 'owner' && profile?.role !== 'owner'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem 
                        key={role.value} 
                        value={role.value}
                        disabled={role.value === 'owner' && profile?.role !== 'owner'}
                      >
                        <div>
                          <div className="font-medium">{role.label}</div>
                          <div className="text-xs text-muted-foreground">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editingStaff && (
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newStaff.is_active}
                    onCheckedChange={(checked) => setNewStaff(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label>Active</Label>
                </div>
              )}
              <Button
                onClick={editingStaff ? handleUpdateStaff : handleInviteStaff}
                className="w-full"
                disabled={!newStaff.full_name || !newStaff.email || !newStaff.role}
              >
                {editingStaff ? 'Update Staff Member' : 'Send Invitation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roleOptions.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredStaff.map((member) => (
          <Card key={member.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={member.avatar_url} alt={member.full_name} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {member.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{member.full_name}</CardTitle>
                  <CardDescription className="flex items-center space-x-2">
                    <Badge className={getRoleColor(member.role)}>
                      {roleOptions.find(r => r.value === member.role)?.label || member.role}
                    </Badge>
                    <Badge variant={member.is_active ? "default" : "secondary"}>
                      {member.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{member.phone}</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Joined {new Date(member.created_at).toLocaleDateString()}
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(member)}
                  className="flex-1"
                >
                  Edit
                </Button>
                {member.user_id !== profile?.user_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStaffStatus(member.id, member.is_active)}
                    className="flex-1"
                  >
                    {member.is_active ? (
                      <>
                        <UserX className="mr-1 h-3 w-3" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="mr-1 h-3 w-3" />
                        Activate
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No staff members found</h3>
          <p className="text-muted-foreground">
            {searchTerm || roleFilter !== 'all' 
              ? 'Try adjusting your filters' 
              : 'Invite your first staff member to get started'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;