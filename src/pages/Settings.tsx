import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, User, Shield, Trash2, Save, Settings as SettingsIcon } from 'lucide-react';

interface CanteenSettings {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  is_active: boolean;
}

const Settings = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [canteenSettings, setCanteenSettings] = useState<CanteenSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    avatar_url: ''
  });

  const [canteenForm, setCanteenForm] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    is_active: true
  });

  useEffect(() => {
    if (profile) {
      fetchSettings();
      setProfileForm({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

  const fetchSettings = async () => {
    if (!profile?.canteen_id) return;

    try {
      const { data, error } = await supabase
        .from('canteens')
        .select('*')
        .eq('id', profile.canteen_id)
        .single();

      if (error) throw error;

      if (data) {
        setCanteenSettings(data);
        setCanteenForm({
          name: data.name || '',
          description: data.description || '',
          address: data.address || '',
          phone: data.phone || '',
          is_active: data.is_active ?? true
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch settings"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profile?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          avatar_url: profileForm.avatar_url
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCanteen = async () => {
    if (!canteenSettings?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('canteens')
        .update(canteenForm)
        .eq('id', canteenSettings.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Canteen settings updated successfully"
      });

      fetchSettings();
    } catch (error) {
      console.error('Error updating canteen:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update canteen settings"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCanteen = async () => {
    if (!profile?.user_id || !canteenForm.name) return;

    setSaving(true);
    try {
      const { data: canteenData, error: canteenError } = await supabase
        .from('canteens')
        .insert([{
          ...canteenForm,
          owner_id: profile.user_id
        }])
        .select()
        .single();

      if (canteenError) throw canteenError;

      // Update profile with canteen_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ canteen_id: canteenData.id })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: "Canteen created successfully"
      });

      // Refresh the page to reload profile data
      window.location.reload();
    } catch (error) {
      console.error('Error creating canteen:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create canteen"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCanteen = async () => {
    if (!canteenSettings?.id) return;

    try {
      const { error } = await supabase
        .from('canteens')
        .delete()
        .eq('id', canteenSettings.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Canteen deleted successfully"
      });

      setDeleteDialogOpen(false);
      // Refresh the page
      window.location.reload();
    } catch (error) {
      console.error('Error deleting canteen:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete canteen"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
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
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your profile and canteen settings</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="canteen">
            <Building2 className="mr-2 h-4 w-4" />
            Canteen
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed from here
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="avatar-url">Avatar URL</Label>
                  <Input
                    id="avatar-url"
                    value={profileForm.avatar_url}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, avatar_url: e.target.value }))}
                    placeholder="Enter avatar image URL"
                  />
                </div>
              </div>
              <div>
                <Label>Role</Label>
                <Input
                  value={profile?.role?.replace('_', ' ') || ''}
                  disabled
                  className="bg-muted capitalize"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Role is managed by your canteen administrator
                </p>
              </div>
              <Button onClick={handleUpdateProfile} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="canteen">
          {canteenSettings ? (
            <Card>
              <CardHeader>
                <CardTitle>Canteen Settings</CardTitle>
                <CardDescription>
                  Manage your canteen information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="canteen-name">Canteen Name</Label>
                  <Input
                    id="canteen-name"
                    value={canteenForm.name}
                    onChange={(e) => setCanteenForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter canteen name"
                  />
                </div>
                <div>
                  <Label htmlFor="canteen-description">Description</Label>
                  <Textarea
                    id="canteen-description"
                    value={canteenForm.description}
                    onChange={(e) => setCanteenForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter canteen description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="canteen-address">Address</Label>
                  <Textarea
                    id="canteen-address"
                    value={canteenForm.address}
                    onChange={(e) => setCanteenForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter canteen address"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="canteen-phone">Phone</Label>
                  <Input
                    id="canteen-phone"
                    value={canteenForm.phone}
                    onChange={(e) => setCanteenForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter canteen phone number"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={canteenForm.is_active}
                    onCheckedChange={(checked) => setCanteenForm(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label>Canteen is active</Label>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleUpdateCanteen} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  {profile?.role === 'owner' && (
                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Canteen
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Canteen</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete this canteen? This action cannot be undone.
                            All data including menu items, orders, and staff will be permanently deleted.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex space-x-2 justify-end">
                          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button variant="destructive" onClick={handleDeleteCanteen}>
                            Delete Permanently
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Create Your Canteen</CardTitle>
                <CardDescription>
                  Set up your canteen to start managing orders and staff
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="new-canteen-name">Canteen Name *</Label>
                  <Input
                    id="new-canteen-name"
                    value={canteenForm.name}
                    onChange={(e) => setCanteenForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter canteen name"
                  />
                </div>
                <div>
                  <Label htmlFor="new-canteen-description">Description</Label>
                  <Textarea
                    id="new-canteen-description"
                    value={canteenForm.description}
                    onChange={(e) => setCanteenForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter canteen description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="new-canteen-address">Address</Label>
                  <Textarea
                    id="new-canteen-address"
                    value={canteenForm.address}
                    onChange={(e) => setCanteenForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter canteen address"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="new-canteen-phone">Phone</Label>
                  <Input
                    id="new-canteen-phone"
                    value={canteenForm.phone}
                    onChange={(e) => setCanteenForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter canteen phone number"
                  />
                </div>
                <Button 
                  onClick={handleCreateCanteen} 
                  disabled={saving || !canteenForm.name}
                  className="w-full"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  {saving ? 'Creating...' : 'Create Canteen'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Password</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Change your password to keep your account secure
                  </p>
                  <Button variant="outline">
                    Change Password
                  </Button>
                </div>
                
                <div>
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add an extra layer of security to your account
                  </p>
                  <Button variant="outline" disabled>
                    Enable 2FA (Coming Soon)
                  </Button>
                </div>

                <div>
                  <h4 className="font-medium">Account Data</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Download or delete your account data
                  </p>
                  <div className="flex space-x-2">
                    <Button variant="outline" disabled>
                      Export Data (Coming Soon)
                    </Button>
                    <Button variant="destructive" disabled>
                      Delete Account (Coming Soon)
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;