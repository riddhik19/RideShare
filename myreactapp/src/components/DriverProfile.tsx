import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Shield, CheckCircle, AlertCircle, Upload, User, Phone, Mail, Edit2 } from "lucide-react";

// Type for profile safely
type Profile = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  kyc_status?: "approved" | "pending" | "rejected" | null;
  kyc_completed_at?: string | null;
  average_rating?: number | null;
  total_ratings?: number | null;
};

const DriverProfile: React.FC = () => {
  const { profile: rawProfile, user } = useAuth();
  const profile: Profile = rawProfile || {} as Profile; // safe fallback
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: profile.full_name ?? "",
    phone: profile.phone ?? "",
  });

  const userId = user?.id;
  if (!userId) return <div>Please log in</div>; // safety for TS

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    try {
      setUploading(true);
      const { error: uploadError } = await supabase.storage
        .from("driver-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("driver-documents")
        .getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
      if (updateError) throw updateError;

      toast({ title: "Success", description: "Profile photo updated successfully!" });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to upload profile photo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const updateProfile = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editData.full_name,
          phone: editData.phone,
        })
        .eq("id", userId);

      if (error) throw error;
      setEditing(false);
      toast({ title: "Success", description: "Profile updated successfully!" });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    }
  };

  const getVerificationStatus = () => {
    if (profile.kyc_status === "approved") return { icon: <CheckCircle className="h-4 w-4" />, text: "Verified Driver", bgColor: "bg-green-100 text-green-800" };
    if (profile.kyc_status === "pending") return { icon: <AlertCircle className="h-4 w-4" />, text: "Verification Pending", bgColor: "bg-yellow-100 text-yellow-800" };
    return { icon: <AlertCircle className="h-4 w-4" />, text: "Not Verified", bgColor: "bg-red-100 text-red-800" };
  };

  const verificationStatus = getVerificationStatus();

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Driver Profile</span>
          </CardTitle>
          <CardDescription>Manage your profile information and verification status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url ?? ""} alt={profile.full_name ?? "Driver"} />
                <AvatarFallback>{profile.full_name?.charAt(0) ?? "D"}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2">
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors">
                    <Camera className="h-4 w-4" />
                  </div>
                  <input id="avatar-upload" type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} className="hidden" />
                </label>
              </div>
            </div>

            {/* Name + Badge */}
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-xl font-semibold">{profile.full_name ?? "Not provided"}</h3>
                <Badge className={verificationStatus.bgColor}>
                  {verificationStatus.icon}
                  <span className="ml-1">{verificationStatus.text}</span>
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
                  <Input value={editData.full_name} onChange={e => setEditData(prev => ({ ...prev, full_name: e.target.value }))} />
                ) : (
                  <div className="mt-1 p-3 bg-muted rounded-md flex items-center">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    {profile.full_name ?? "Not provided"}
                  </div>
                )}
              </div>
              <div>
                <Label>Email</Label>
                <div className="mt-1 p-3 bg-muted rounded-md flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  {profile.email ?? "Not provided"}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Phone Number</Label>
                {editing ? (
                  <Input value={editData.phone} onChange={e => setEditData(prev => ({ ...prev, phone: e.target.value }))} placeholder="Enter phone" />
                ) : (
                  <div className="mt-1 p-3 bg-muted rounded-md flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    {profile.phone ?? "Not provided"}
                  </div>
                )}
              </div>

              <div>
                <Label>Account Status</Label>
                <div className="mt-1 p-3 bg-muted rounded-md flex items-center justify-between">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{profile.role === "driver" ? "Driver Account" : "Standard Account"}</span>
                  </div>
                  {profile.kyc_status === "approved" && <CheckCircle className="h-4 w-4 text-green-600" />}
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

      {/* Verification Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Verification Status</span>
          </CardTitle>
          <CardDescription>Your account verification and KYC status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${
                  profile.kyc_status === "approved" ? "bg-green-100" :
                  profile.kyc_status === "pending" ? "bg-yellow-100" : "bg-red-100"
                }`}>
                  {profile.kyc_status === "approved" ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-yellow-600" />}
                </div>
                <div>
                  <h4 className="font-medium">KYC Verification</h4>
                  <p className="text-sm text-muted-foreground">
                    {profile.kyc_status === "approved" ? "Your documents have been verified successfully"
                    : profile.kyc_status === "pending" ? "Your documents are under review"
                    : "Please complete your KYC verification"}
                  </p>
                </div>
              </div>
              <Badge className={verificationStatus.bgColor}>{verificationStatus.text}</Badge>
            </div>
            {profile.kyc_completed_at && <div className="text-sm text-muted-foreground">Verified on: {new Date(profile.kyc_completed_at).toLocaleDateString()}</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverProfile;
