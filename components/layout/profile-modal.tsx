"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabase, type Profile } from "@/lib/supabase";
import { User, Mail, Calendar, Trophy, Settings } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: "",
    email: user?.email || "",
    bio: "NFL PickEm enthusiast who loves making predictions and competing with friends!",
    favoriteTeam: "Any Team",
    joinDate: new Date().toLocaleDateString(),
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();

      const email = user?.email ?? "";

      if (!error && data) {
        setProfileData((prev) => ({
          ...prev,
          displayName:
            data.display_name || (email ? email.split("@")[0] : "User"),
          email: email || prev.email,
        }));
      } else {
        setProfileData((prev) => ({
          ...prev,
          displayName: email ? email.split("@")[0] : prev.displayName || "User",
          email: email || prev.email,
        }));
      }
    };

    if (isOpen) {
      loadProfile();
    }
  }, [isOpen, user]);

  const handleSave = () => {
    setIsEditing(false);
    // Here you would typically save to your backend
    console.log("Profile updated:", profileData);
  };

  const handleCancel = () => {
    setProfileData({
      displayName: user?.user_metadata?.full_name || "User",
      email: user?.email || "",
      bio: "NFL PickEm enthusiast who loves making predictions and competing with friends!",
      favoriteTeam: "Any Team",
      joinDate: new Date().toLocaleDateString(),
    });
    setIsEditing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Header */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <Input
                      value={profileData.displayName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          displayName: e.target.value,
                        })
                      }
                      className="text-lg font-semibold"
                    />
                  ) : (
                    <h3 className="text-lg font-semibold">
                      {profileData.displayName}
                    </h3>
                  )}
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {profileData.email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Details */}
          {/* <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bio</Label>
                  {isEditing ? (
                    <Input
                      value={profileData.bio}
                      onChange={(e) =>
                        setProfileData({ ...profileData, bio: e.target.value })
                      }
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {profileData.bio}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Favorite Team</Label>
                  {isEditing ? (
                    <Input
                      value={profileData.favoriteTeam}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          favoriteTeam: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <Badge variant="secondary">
                      {profileData.favoriteTeam}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Member since {profileData.joinDate}
              </div>
            </CardContent>
          </Card> */}<div className="flex-1">
                  {isEditing ? (
                    <Input
                      value={profileData.displayName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          displayName: e.target.value,
                        })
                      }
                      className="text-lg font-semibold"
                    />
                  ) : (
                    <h3 className="text-lg font-semibold">
                      {profileData.displayName}
                    </h3>
                  )}
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {profileData.email}
                  </p>
                </div>

          {/* Stats Preview */}
          {/* <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">12</div>
                  <div className="text-xs text-muted-foreground">Leagues</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">156</div>
                  <div className="text-xs text-muted-foreground">
                    Picks Made
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">8</div>
                  <div className="text-xs text-muted-foreground">Wins</div>
                </div>
              </div>
            </CardContent>
          </Card> */}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save Changes</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
