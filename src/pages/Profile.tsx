
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserIcon, LogOutIcon, RefreshCwIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Booking } from "@/types/booking";

export default function Profile() {
  const { user, profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchBookings();
  }, [user, navigate]);

  const fetchBookings = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      console.log("Fetching bookings for user ID:", user?.id);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          venues (name),
          sports (name)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching bookings:", error);
        toast({
          title: "Error fetching bookings",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log("Bookings fetched:", data);
      setBookings(data || []);
    } catch (error: any) {
      console.error("Error fetching bookings:", error);
      toast({
        title: "Error fetching bookings",
        description: error.message || "Could not fetch bookings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
      setIsSigningOut(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <PageHeader 
        title="Profile" 
        action={
          <Button variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
            <LogOutIcon className="mr-2 h-4 w-4" />
            {isSigningOut ? "Signing Out..." : "Sign Out"}
          </Button>
        }
      />
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback>
                  <UserIcon className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{profile?.first_name} {profile?.last_name}</CardTitle>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your Bookings</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchBookings}
              disabled={isLoading}
            >
              <RefreshCwIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No bookings found.</p>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{booking.venues?.name} - {booking.sports?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Slot: {new Date(booking.slot_time).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Status: {booking.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
