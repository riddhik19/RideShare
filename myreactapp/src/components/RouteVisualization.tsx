import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Navigation, MapPin, Clock, Users, Route, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RouteVisualizationProps {
  fromCity: string;
  toCity: string;
  departure_time?: string;
  pickup_point?: string;
  className?: string;
}

export const RouteVisualization: React.FC<RouteVisualizationProps> = ({
  fromCity,
  toCity,
  departure_time,
  pickup_point,
  className
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(true);
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const initializeMap = async (token: string) => {
    if (!mapRef.current || !token) return;

    try {
      // Dynamic import of mapbox-gl
      const mapboxgl = (await import('mapbox-gl')).default;
      
      // Set access token
      mapboxgl.accessToken = token;

      // Geocode cities to get coordinates
      const fromCoords = await geocodeCity(fromCity, token);
      const toCoords = await geocodeCity(toCity, token);

      if (!fromCoords || !toCoords) {
        throw new Error('Unable to geocode cities');
      }

      // Initialize map
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [
          (fromCoords[0] + toCoords[0]) / 2,
          (fromCoords[1] + toCoords[1]) / 2
        ],
        zoom: 6
      });

      // Add markers
      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat(fromCoords)
        .setPopup(new mapboxgl.Popup().setHTML(`<div class="p-2"><strong>From:</strong> ${fromCity}</div>`))
        .addTo(map);

      new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat(toCoords)
        .setPopup(new mapboxgl.Popup().setHTML(`<div class="p-2"><strong>To:</strong> ${toCity}</div>`))
        .addTo(map);

      // Get and display route
      const route = await getRoute(fromCoords, toCoords, token);
      if (route) {
        setRouteData(route);
        
        map.on('load', () => {
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route.geometry
            }
          });

          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 4
            }
          });

          // Fit map to route
          const coordinates = route.geometry.coordinates;
          const bounds = coordinates.reduce((bounds: any, coord: any) => {
            return bounds.extend(coord);
          }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

          map.fitBounds(bounds, { padding: 50 });
        });
      }

      setShowTokenInput(false);
      toast({
        title: "Map loaded successfully",
        description: "Route visualization is now active"
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      toast({
        title: "Map Error",
        description: "Failed to load map. Please check your Mapbox token.",
        variant: "destructive"
      });
    }
  };

  const geocodeCity = async (city: string, token: string) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(city)}.json?access_token=${token}&types=place&country=IN`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].center;
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const getRoute = async (from: number[], to: number[], token: string) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&access_token=${token}`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        return data.routes[0];
      }
      return null;
    } catch (error) {
      console.error('Routing error:', error);
      return null;
    }
  };

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      setLoading(true);
      initializeMap(mapboxToken.trim()).finally(() => setLoading(false));
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDistance = (meters: number) => {
    const km = (meters / 1000).toFixed(1);
    return `${km} km`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Navigation className="h-5 w-5 text-primary" />
          <span>Route Visualization</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showTokenInput ? (
          <div className="space-y-4">
            <div className="flex items-start space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Mapbox Token Required</p>
                <p className="text-amber-700">
                  Get your free token from{' '}
                  <a 
                    href="https://mapbox.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-900"
                  >
                    mapbox.com
                  </a>
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Input
                placeholder="Enter your Mapbox public token"
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
                type="password"
              />
              <Button 
                onClick={handleTokenSubmit}
                disabled={!mapboxToken.trim() || loading}
              >
                {loading ? 'Loading...' : 'Load Map'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Route Information */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  <span className="font-medium">{fromCity}</span> → <span className="font-medium">{toCity}</span>
                </span>
              </div>
              {departure_time && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{departure_time}</span>
                </div>
              )}
            </div>

            {/* Route Stats */}
            {routeData && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Badge variant="outline" className="justify-center py-2">
                  <Route className="h-3 w-3 mr-1" />
                  {formatDistance(routeData.distance)}
                </Badge>
                <Badge variant="outline" className="justify-center py-2">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(routeData.duration)}
                </Badge>
              </div>
            )}

            {/* Map Container */}
            <div 
              ref={mapRef} 
              className="w-full h-64 rounded-lg border bg-muted"
              style={{ minHeight: '256px' }}
            />

            {pickup_point && (
              <div className="flex items-center space-x-2 p-3 bg-primary/5 rounded-lg">
                <MapPin className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Pickup Point</p>
                  <p className="text-sm text-muted-foreground">{pickup_point}</p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};