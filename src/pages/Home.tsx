import { PageHeader } from "@/components/ui/page-header";
import { SportCard } from "@/components/sport-card";
import { VenueCard } from "@/components/venue-card";
import { SmartRecommendations } from "@/components/smart-recommendations";
import { Button } from "@/components/ui/button";
import { SportBackground } from "@/components/ui/sport-background";
import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sport, Venue } from "@/types/venue";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { FloatingQuotes } from "@/components/floating-quotes";

export default function Home() {
  const { user } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: venueData, error: venueError } = await supabase
          .from('venues')
          .select('*')
          .limit(4);
        
        if (venueError) throw venueError;
        
        const { data: sportData, error: sportError } = await supabase
          .from('sports')
          .select('*');
        
        if (sportError) throw sportError;
        
        setVenues(venueData || []);
        setSports(sportData || []);
      } catch (error) {
        console.error("Error fetching home data:", error);
        toast.error("Failed to load home page data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="space-y-12 pb-8">
      <SportBackground>
        <section className="py-24 px-4 md:px-8 rounded-3xl bg-gradient-to-r from-sports-blue to-sports-blue/80 text-white shadow-lg transition-all hover:shadow-xl">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in leading-tight">
              Find Your Game. Own the Moment.
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 leading-relaxed">
              Book premium sports venues in Delhi — pro coaching, elite vibes, no hassle.
            </p>
            <Link to="/venue">
              <Button 
                size="lg" 
                className="rounded-full px-8 py-6 text-lg bg-white text-sports-blue hover:bg-white/90 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Book Now
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </SportBackground>

      {user && (
        <section className="rounded-3xl p-8 bg-gradient-to-r from-sports-lightBlue to-white shadow-lg transition-all hover:shadow-xl">
          <SmartRecommendations />
        </section>
      )}

      <section className="rounded-3xl p-8 bg-gradient-to-r from-sports-lightOrange to-white shadow-lg transition-all hover:shadow-xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-sports-orange mb-2">Popular Sports</h2>
            <p className="text-gray-600">Choose from our wide range of sports activities</p>
          </div>
          <Link to="/venue">
            <Button 
              variant="outline" 
              className="rounded-full border-sports-orange text-sports-orange hover:bg-sports-orange hover:text-white transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md"
            >
              View All
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {sports.map((sport) => (
              <SportCard key={sport.id} sport={sport} className="transition-all duration-300 hover:scale-105" />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl p-8 bg-gradient-to-r from-gray-50 to-white shadow-lg transition-all hover:shadow-xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Featured Venues</h2>
            <p className="text-gray-600">Discover our top-rated sports facilities</p>
          </div>
          <Link to="/venue">
            <Button 
              variant="outline" 
              className="rounded-full shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105"
            >
              View All
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {venues.map((venue) => (
              <VenueCard 
                key={venue.id} 
                venue={venue} 
                className="transition-all duration-300 hover:scale-105"
              />
            ))}
          </div>
        )}
      </section>

      <FloatingQuotes />
    </div>
  );
}
