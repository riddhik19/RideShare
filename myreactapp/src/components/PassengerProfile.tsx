import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Camera, Shield, CheckCircle, Upload, User, Phone, Mail, Edit2, MapPin } from 'lucide-react';

const PassengerProfile = () => {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || ''
  });

  useEffect(() => {
    if (profile) {
      setEditData({
        full_name: profile.full_name || '',
        phone: profile.phone || ''
      });
    }
  }, [profile]);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.id) return; // early return if user not logged in

    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) throw new Error('Select an image.');

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('driver-documents')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();

      toast({ title: "Success", description: "Profile photo updated successfully!" });

    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: "Error", description: "Failed to upload profile photo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const updateProfile = async () => {
    if (!user?.id) return; // early return if user not logged in

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name,
          phone: editData.phone
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setEditing(false);
      toast({ title: "Success", description: "Profile updated successfully!" });

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>My Profile</span>
          </CardTitle>
          <CardDescription>Manage your profile information and travel preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage 
                  src={profile?.avatar_url || ''} 
                  alt={profile?.full_name || 'Passenger'} 
                />
                <AvatarFallback>{profile?.full_name?.charAt(0) || 'P'}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2">
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors">
                    <Camera className="h-4 w-4" />
                  </div>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={uploadAvatar}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-xl font-semibold">{profile?.full_name}</h3>
                <Badge className="bg-blue-100 text-blue-800">
                  <User className="h-3 w-3 mr-1" />
                  Passenger
                </Badge>
              </div>

              {uploading && (
                <div className="flex items-center space-x-2 mt-2">
                  <Upload className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Uploading...</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                {editing ? (
                  <Input
                    id="full_name"
                    value={editData.full_name}
                    onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-muted rounded-md flex items-center">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    {profile?.full_name || 'Not provided'}
                  </div>
                )}
              </div>

              <div>
                <Label>Email</Label>
                <div className="mt-1 p-3 bg-muted rounded-md flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  {profile?.email}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Phone Number</Label>
                {editing ? (
                  <Input
                    id="phone"
                    value={editData.phone}
                    onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-muted rounded-md flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    {profile?.phone || 'Not provided'}
                  </div>
                )}
              </div>

              <div>
                <Label>Account Type</Label>
                <div className="mt-1 p-3 bg-muted rounded-md flex items-center justify-between">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Passenger Account</span>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button onClick={updateProfile}>Save Changes</Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PassengerProfile;