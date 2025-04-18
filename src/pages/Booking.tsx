import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format, parse, isValid } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  TimeIcon, 
  PriceIcon, 
  LocationIcon, 
  UserIcon, 
  PhoneIcon 
} from "@/utils/iconMapping";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Slot, Venue, Sport } from "@/types/venue";
import type { Booking } from "@/types/booking";

export default function Booking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const slotId = searchParams.get('slotId');
  const { user } = useAuth();
  
  const [slot, setSlot] = useState<Slot | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!user) {
      toast.error("You must be logged in to book a slot");
      navigate("/auth", { replace: true });
      return;
    }

    const fetchSlotDetails = async () => {
      if (!slotId) {
        toast.error("No slot selected");
        navigate("/venue");
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        console.log("Fetching slot with ID:", slotId);
        
        const { data: slotData, error: slotError } = await supabase
          .from('slots')
          .select('*')
          .eq('id', slotId)
          .single();
        
        if (slotError) {
          console.error("Slot fetch error:", slotError);
          throw new Error("Could not find the selected slot. It may have been removed.");
        }
        
        if (!slotData.available) {
          toast.error("This slot is not available for booking");
          navigate("/slots");
          return;
        }
        
        setSlot(slotData);
        
        const { data: venueData, error: venueError } = await supabase
          .from('venues')
          .select('*')
          .eq('id', slotData.venue_id)
          .single();
        
        if (venueError) throw venueError;
        setVenue(venueData);
        
        const { data: sportData, error: sportError } = await supabase
          .from('sports')
          .select('*')
          .eq('id', slotData.sport_id)
          .single();
        
        if (sportError) throw sportError;
        setSport(sportData);
      } catch (error: any) {
        console.error("Error fetching slot:", error);
        setError(error.message || "Failed to load booking details");
        toast.error("Failed to load booking details");
        setTimeout(() => {
          navigate("/slots");
        }, 2000);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSlotDetails();
  }, [slotId, navigate, user]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to book a slot");
      navigate("/auth");
      return;
    }

    if (!slot || !venue || !sport) {
      toast.error("Invalid slot selection");
      return;
    }
    
    if (!name.trim() || !phone.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let slotDateTime;
      
      try {
        if (!slot.date || !slot.start_time) {
          throw new Error("Missing date or time information");
        }
        
        let formattedDate = slot.date;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(slot.date)) {
          const parsedDate = new Date(slot.date);
          if (!isNaN(parsedDate.getTime())) {
            formattedDate = format(parsedDate, 'yyyy-MM-dd');
          } else {
            throw new Error(`Could not parse date: ${slot.date}`);
          }
        }
        
        slotDateTime = `${formattedDate} ${slot.start_time}`;
        
        if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(slotDateTime)) {
          throw new Error(`Invalid date/time format: ${slotDateTime}`);
        }
        
        console.log("Slot date/time for database:", slotDateTime);
      } catch (dateError) {
        console.error("Date construction error:", dateError);
        toast.error("Invalid date format. Please try again.");
        setIsSubmitting(false);
        return;
      }
      
      const booking = {
        user_id: user.id,
        venue_id: venue.id,
        sport_id: sport.id,
        slot_id: slot.id,
        slot_time: slotDateTime,
        status: 'confirmed',
        full_name: name,
        phone: phone,
        amount: slot.price || 0
      };
      
      console.log("Creating booking with data:", booking);
      
      const { data, error } = await supabase
        .from('bookings')
        .insert(booking)
        .select()
        .single();
      
      if (error) {
        console.error("Booking error:", error);
        
        if (error.message.includes("date/time") || error.message.includes("out of range")) {
          toast.error("Failed to save booking: Invalid date/time format. Please try a different slot.");
        } else {
          toast.error("Failed to save booking: " + error.message);
        }
        return;
      }
      
      console.log("Booking created successfully:", data);
      
      await supabase
        .from('slots')
        .update({ available: false })
        .eq('id', slot.id);
      
      toast.success("Booking confirmed! You'll receive details on your phone.");
      navigate("/booking-success");
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold mb-2">Loading booking details...</h3>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold mb-2">Error: {error}</h3>
        <Button onClick={() => navigate("/slots")} className="mt-4">
          Return to Slots
        </Button>
      </div>
    );
  }
  
  if (!slot || !venue || !sport) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold mb-2">Invalid booking details</h3>
        <Button onClick={() => navigate("/slots")} className="mt-4">
          Return to Slots
        </Button>
      </div>
    );
  }
  
  let formattedDate = "Invalid date";
  try {
    let dateObj;
    
    if (typeof slot.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(slot.date)) {
      dateObj = new Date(`${slot.date}T00:00:00`);
    } else {
      dateObj = new Date(slot.date);
    }
    
    if (!isNaN(dateObj.getTime())) {
      formattedDate = format(dateObj, "EEEE, MMMM d, yyyy");
    } else {
      throw new Error(`Unable to parse date: ${slot.date}`);
    }
  } catch (dateError) {
    console.error("Error formatting date:", dateError);
    formattedDate = String(slot.date);
  }
  
  return (
    <div>
      <PageHeader 
        title="Complete Your Booking" 
        subtitle="Enter your details to confirm the reservation"
        showBackButton
        backTo={`/slots?venueId=${venue.id}&sportId=${sport.id}`}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-xl font-semibold mb-4">Booking Summary</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Sport</h4>
                <p className="text-lg">{sport.name}</p>
              </div>
              
              <div>
                <h4 className="font-medium">Venue</h4>
                <div className="flex items-start">
                  <LocationIcon className="h-5 w-5 mr-2 mt-0.5 text-gray-500" />
                  <div>
                    <p className="text-lg">{venue.name}</p>
                    <p className="text-gray-500">{venue.address}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium">Date & Time</h4>
                <div className="flex items-center">
                  <TimeIcon className="h-5 w-5 mr-2 text-gray-500" />
                  <p>{formattedDate}, {slot.start_time} - {slot.end_time}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Total Amount</h4>
                  <div className="flex items-center text-xl font-bold text-sports-orange">
                    <PriceIcon className="h-5 w-5 mr-1" />
                    <span>₹{slot.price}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <form onSubmit={handleSubmit}>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-4">Contact Information</h3>
              
              <div className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                      id="name" 
                      placeholder="Enter your full name" 
                      className="pl-10" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                      id="phone" 
                      placeholder="Enter your phone number" 
                      className="pl-10" 
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      maxLength={10}
                      required
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end pt-4 border-t">
              <Button 
                type="submit" 
                className="w-full md:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Confirm Booking"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
