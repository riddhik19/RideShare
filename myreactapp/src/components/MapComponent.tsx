import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Users, Phone, Share2 } from 'lucide-react';

interface MapComponentProps {
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  destination?: string;
  passengers?: Array<{
    full_name: string;
    phone: string;
    pickup_location?: string;
  }>;
  isSharing?: boolean;
  onToggleSharing?: () => void;
}

// Placeholder token - will be replaced with actual Mapbox token from Supabase secrets
const MAPBOX_TOKEN = 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ.example';

const MapComponent: React.FC<MapComponentProps> = ({
  currentLocation,
  destination,
  passengers = [],
  isSharing = false,
  onToggleSharing
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const locationMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Set Mapbox access token
    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: currentLocation ? [currentLocation.longitude, currentLocation.latitude] : [77.2090, 28.6139], // Default to Delhi
      zoom: 13,
      pitch: 45,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Add geolocate control
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    });
    map.current.addControl(geolocate, 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
      
      // Add location marker if available
      if (currentLocation && map.current) {
        updateLocationMarker(currentLocation);
      }
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Update location marker when location changes
  useEffect(() => {
    if (mapLoaded && currentLocation && map.current) {
      updateLocationMarker(currentLocation);
    }
  }, [currentLocation, mapLoaded]);

  const updateLocationMarker = (location: { latitude: number; longitude: number }) => {
    if (!map.current) return;

    // Remove existing marker
    if (locationMarker.current) {
      locationMarker.current.remove();
    }

    // Create custom marker element
    const markerElement = document.createElement('div');
    markerElement.className = 'driver-location-marker';
    markerElement.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #3b82f6;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
    `;

    // Add pulsing animation if sharing location
    if (isSharing) {
      markerElement.style.animation = 'pulse 2s infinite';
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `;
      document.head.appendChild(style);
    }

    // Create new marker
    locationMarker.current = new mapboxgl.Marker(markerElement)
      .setLngLat([location.longitude, location.latitude])
      .addTo(map.current);

    // Center map on new location
    map.current.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 15,
      duration: 1000
    });

    // Add popup with location info
    const popup = new mapboxgl.Popup({ offset: 25 })
      .setHTML(`
        <div class="p-2">
          <h3 class="font-semibold text-sm">Driver Location</h3>
          <p class="text-xs text-gray-600">Live tracking ${isSharing ? '(Sharing)' : '(Private)'}</p>
          <p class="text-xs mt-1">${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}</p>
        </div>
      `);

    locationMarker.current.setPopup(popup);
  };

  const addDestinationMarker = async () => {
    if (!destination || !map.current) return;

    try {
      // Geocode destination
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${MAPBOX_TOKEN}&country=IN`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        
        // Add destination marker
        const destElement = document.createElement('div');
        destElement.style.cssText = `
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ef4444;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;

        new mapboxgl.Marker(destElement)
          .setLngLat([lng, lat])
          .setPopup(
            new mapboxgl.Popup().setHTML(`
              <div class="p-2">
                <h3 class="font-semibold text-sm">Destination</h3>
                <p class="text-xs">${destination}</p>
              </div>
            `)
          )
          .addTo(map.current);

        // Add route if we have current location
        if (currentLocation) {
          addRoute([currentLocation.longitude, currentLocation.latitude], [lng, lat]);
        }
      }
    } catch (error) {
      console.error('Error geocoding destination:', error);
    }
  };

  const addRoute = async (start: [number, number], end: [number, number]) => {
    if (!map.current) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0].geometry;

        // Add route layer
        if (map.current.getSource('route')) {
          (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData(route);
        } else {
          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: {
              type: 'geojson',
              data: route
            },
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 4,
              'line-opacity': 0.8
            }
          });
        }

        // Fit map to show entire route
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend(start);
        bounds.extend(end);
        
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 }
        });
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  // Add destination marker when destination changes
  useEffect(() => {
    if (mapLoaded && destination) {
      addDestinationMarker();
    }
  }, [destination, mapLoaded]);

  const shareCurrentLocation = () => {
    if (!currentLocation) return;

    const mapsUrl = `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Driver Live Location',
        text: 'Track my live location during the trip',
        url: mapsUrl
      });
    } else {
      navigator.clipboard.writeText(mapsUrl);
    }
  };

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div className="relative w-full h-96 rounded-lg overflow-hidden border">
        <div ref={mapContainer} className="absolute inset-0" />
        
        {/* Map Overlay Controls */}
        <div className="absolute top-4 left-4 space-y-2">
          <Badge variant={isSharing ? "default" : "secondary"} className="bg-white/90 text-black">
            {isSharing ? 'Live Sharing Active' : 'Location Private'}
          </Badge>
          
          {currentLocation && (
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Live Location Active</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-4 left-4 right-4 flex gap-2">
          <Button 
            size="sm" 
            onClick={onToggleSharing}
            variant={isSharing ? "destructive" : "default"}
            className="flex-1"
          >
            <Share2 className="h-4 w-4 mr-2" />
            {isSharing ? 'Stop Sharing' : 'Share Live Location'}
          </Button>
          
          {currentLocation && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={shareCurrentLocation}
              className="bg-white/90"
            >
              <Navigation className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Passengers Info */}
      {passengers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Passengers on Trip</span>
            </div>
            
            <div className="space-y-2">
              {passengers.map((passenger, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <p className="font-medium text-sm">{passenger.full_name}</p>
                    {passenger.pickup_location && (
                      <p className="text-xs text-muted-foreground">{passenger.pickup_location}</p>
                    )}
                  </div>
                  
                  {passenger.phone && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`tel:${passenger.phone}`)}
                    >
                      <Phone className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Location Status Info */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location Status:</span>
              <span className={currentLocation ? 'text-green-600' : 'text-red-600'}>
                {currentLocation ? 'Active' : 'Not Available'}
              </span>
            </div>
            
            {currentLocation && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coordinates:</span>
                  <span className="font-mono text-xs">
                    {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sharing Status:</span>
                  <span className={isSharing ? 'text-green-600' : 'text-gray-600'}>
                    {isSharing ? 'Live Location Shared' : 'Private'}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MapComponent;