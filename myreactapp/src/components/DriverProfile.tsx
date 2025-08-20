// src/components/DriverProfile.tsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Shield, CheckCircle, AlertCircle, Upload, User, Phone, Mail, Edit2, Star, TrendingUp, Users } from "lucide-react";
import { getDriverRatings, getDriverRatingSummary, type DriverRating, type DriverRatingSummary } from "@/integrations/supabase/ratingService";

// Profile type
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
  const { profile: rawProfile, user, refreshProfile } = useAuth();
  const profile: Profile = rawProfile || {} as Profile;
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: profile.full_name ?? "",
    phone: profile.phone ?? "",
  });

  // Ratings state
  const [ratings, setRatings] = useState<DriverRating[]>([]);
  const [summary, setSummary] = useState<DriverRatingSummary>({ avg_rating: 0, ratings_count: 0 });
  const [loadingRatings, setLoadingRatings] = useState(true);

  const userId = user?.id;
  if (!userId) return <div>Please log in</div>;

  // Fetch ratings on mount
  useEffect(() => {
    if (profile.id) {
      fetchRatings();
      fetchSummary();
    }
  }, [profile.id]);

  // Update local state when profile changes
  useEffect(() => {
    setEditData({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
    });
  }, [profile.full_name, profile.phone]);

  const fetchRatings = async () => {
    try {
      setLoadingRatings(true);
      const data = await getDriverRatings(profile.id);
      setRatings(data);
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoadingRatings(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await getDriverRatingSummary(profile.id);
      setSummary(data);
    } catch (error) {
      console.error('Error fetching rating summary:', error);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    try {
      setUploading(true);
      const { error: uploadError } = await supabase.storage.from("driver-documents").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("driver-documents").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
      if (updateError) throw updateError;

      await refreshProfile();
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
      const { error } = await supabase.from("profiles").update({
        full_name: editData.full_name,
        phone: editData.phone,
      }).eq("id", userId);

      if (error) throw error;
      
      await refreshProfile();
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

  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const sizeClass = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
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
          <CardDescription>Manage your profile and verification status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-xl font-semibold">{profile.full_name ?? "Not provided"}</h3>
                <Badge className={verificationStatus.bgColor}>
                  {verificationStatus.icon}
                  <span className="ml-1">{verificationStatus.text}</span>
                </Badge>
              </div>
              
              {/* Rating Display */}
              {summary.ratings_count > 0 && (
                <div className="flex items-center space-x-3 mb-2">
                  <div className="flex items-center space-x-2">
                    {renderStars(Math.round(summary.avg_rating))}
                    <span className="font-medium text-lg">{summary.avg_rating.toFixed(1)}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ({summary.ratings_count} reviews)
                  </span>
                </div>
              )}
              
              {uploading && (
                <div className="flex items-center space-x-2 mt-2">
                  <Upload className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Uploading...</span>
                </div>
              )}
            </div>
          </div>

          {/* Editable Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
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

      {/* Rating Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5" />
            <span>Rating Overview</span>
          </CardTitle>
          <CardDescription>
            Your passenger ratings and feedback summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary.ratings_count > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {renderStars(Math.round(summary.avg_rating), 'lg')}
                </div>
                <div className="text-3xl font-bold text-primary mb-1">
                  {summary.avg_rating.toFixed(1)}
                </div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary mb-1">
                  {summary.ratings_count}
                </div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-lg font-semibold text-green-600 mb-1">
                  {summary.avg_rating >= 4.5 ? 'Excellent' : 
                   summary.avg_rating >= 4.0 ? 'Very Good' : 
                   summary.avg_rating >= 3.5 ? 'Good' : 'Improving'}
                </div>
                <p className="text-sm text-muted-foreground">Performance</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Ratings Yet</h3>
              <p className="text-muted-foreground">
                Complete some rides to start receiving passenger feedback
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Reviews Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5" />
            <span>Recent Reviews</span>
          </CardTitle>
          <CardDescription>
            Latest feedback from your passengers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRatings ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : ratings.length > 0 ? (
            <div className="space-y-4">
              {ratings.slice(0, 5).map((review) => (
                <div key={review.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{review.passenger_name || 'Anonymous Passenger'}</h4>
                        <div className="flex items-center gap-2">
                          {renderStars(review.rating)}
                          <span className="text-sm text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {review.rating}/5 Stars
                    </Badge>
                  </div>
                  
                  {review.feedback && (
                    <div className="bg-muted/50 rounded-md p-3 mt-3">
                      <p className="text-sm italic">"{review.feedback}"</p>
                    </div>
                  )}
                </div>
              ))}
              
              {ratings.length > 5 && (
                <div className="text-center pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing 5 of {ratings.length} reviews
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
              <p className="text-muted-foreground">
                Complete rides to start receiving passenger feedback
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverProfile;