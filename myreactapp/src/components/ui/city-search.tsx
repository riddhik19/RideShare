import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Comprehensive list of major Indian cities with states
const INDIAN_CITIES = [
  { name: 'Mumbai', state: 'Maharashtra' },
  { name: 'Delhi', state: 'Delhi' },
  { name: 'Bangalore', state: 'Karnataka' },
  { name: 'Bengaluru', state: 'Karnataka' },
  { name: 'Hyderabad', state: 'Telangana' },
  { name: 'Ahmedabad', state: 'Gujarat' },
  { name: 'Chennai', state: 'Tamil Nadu' },
  { name: 'Kolkata', state: 'West Bengal' },
  { name: 'Surat', state: 'Gujarat' },
  { name: 'Pune', state: 'Maharashtra' },
  { name: 'Jaipur', state: 'Rajasthan' },
  { name: 'Lucknow', state: 'Uttar Pradesh' },
  { name: 'Kanpur', state: 'Uttar Pradesh' },
  { name: 'Nagpur', state: 'Maharashtra' },
  { name: 'Indore', state: 'Madhya Pradesh' },
  { name: 'Thane', state: 'Maharashtra' },
  { name: 'Bhopal', state: 'Madhya Pradesh' },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { name: 'Pimpri-Chinchwad', state: 'Maharashtra' },
  { name: 'Patna', state: 'Bihar' },
  { name: 'Vadodara', state: 'Gujarat' },
  { name: 'Ghaziabad', state: 'Uttar Pradesh' },
  { name: 'Ludhiana', state: 'Punjab' },
  { name: 'Agra', state: 'Uttar Pradesh' },
  { name: 'Nashik', state: 'Maharashtra' },
  { name: 'Faridabad', state: 'Haryana' },
  { name: 'Meerut', state: 'Uttar Pradesh' },
  { name: 'Rajkot', state: 'Gujarat' },
  { name: 'Kalyan-Dombivli', state: 'Maharashtra' },
  { name: 'Vasai-Virar', state: 'Maharashtra' },
  { name: 'Varanasi', state: 'Uttar Pradesh' },
  { name: 'Srinagar', state: 'Jammu and Kashmir' },
  { name: 'Aurangabad', state: 'Maharashtra' },
  { name: 'Dhanbad', state: 'Jharkhand' },
  { name: 'Amritsar', state: 'Punjab' },
  { name: 'Navi Mumbai', state: 'Maharashtra' },
  { name: 'Allahabad', state: 'Uttar Pradesh' },
  { name: 'Prayagraj', state: 'Uttar Pradesh' },
  { name: 'Ranchi', state: 'Jharkhand' },
  { name: 'Howrah', state: 'West Bengal' },
  { name: 'Coimbatore', state: 'Tamil Nadu' },
  { name: 'Jabalpur', state: 'Madhya Pradesh' },
  { name: 'Gwalior', state: 'Madhya Pradesh' },
  { name: 'Vijayawada', state: 'Andhra Pradesh' },
  { name: 'Jodhpur', state: 'Rajasthan' },
  { name: 'Madurai', state: 'Tamil Nadu' },
  { name: 'Raipur', state: 'Chhattisgarh' },
  { name: 'Kota', state: 'Rajasthan' },
  { name: 'Chandigarh', state: 'Chandigarh' },
  { name: 'Guwahati', state: 'Assam' },
  { name: 'Solapur', state: 'Maharashtra' },
  { name: 'Hubli-Dharwad', state: 'Karnataka' },
  { name: 'Bareilly', state: 'Uttar Pradesh' },
  { name: 'Moradabad', state: 'Uttar Pradesh' },
  { name: 'Mysore', state: 'Karnataka' },
  { name: 'Mysuru', state: 'Karnataka' },
  { name: 'Gurgaon', state: 'Haryana' },
  { name: 'Gurugram', state: 'Haryana' },
  { name: 'Aligarh', state: 'Uttar Pradesh' },
  { name: 'Jalandhar', state: 'Punjab' },
  { name: 'Tiruchirappalli', state: 'Tamil Nadu' },
  { name: 'Bhubaneswar', state: 'Odisha' },
  { name: 'Salem', state: 'Tamil Nadu' },
  { name: 'Warangal', state: 'Telangana' },
  { name: 'Mira-Bhayandar', state: 'Maharashtra' },
  { name: 'Thiruvananthapuram', state: 'Kerala' },
  { name: 'Bhiwandi', state: 'Maharashtra' },
  { name: 'Saharanpur', state: 'Uttar Pradesh' },
  { name: 'Guntur', state: 'Andhra Pradesh' },
  { name: 'Amravati', state: 'Maharashtra' },
  { name: 'Bikaner', state: 'Rajasthan' },
  { name: 'Noida', state: 'Uttar Pradesh' },
  { name: 'Jamshedpur', state: 'Jharkhand' },
  { name: 'Bhilai', state: 'Chhattisgarh' },
  { name: 'Cuttack', state: 'Odisha' },
  { name: 'Firozabad', state: 'Uttar Pradesh' },
  { name: 'Kochi', state: 'Kerala' },
  { name: 'Nellore', state: 'Andhra Pradesh' },
  { name: 'Bhavnagar', state: 'Gujarat' },
  { name: 'Dehradun', state: 'Uttarakhand' },
  { name: 'Durgapur', state: 'West Bengal' },
  { name: 'Asansol', state: 'West Bengal' },
  { name: 'Rourkela', state: 'Odisha' },
  { name: 'Nanded', state: 'Maharashtra' },
  { name: 'Kolhapur', state: 'Maharashtra' },
  { name: 'Ajmer', state: 'Rajasthan' },
  { name: 'Akola', state: 'Maharashtra' },
  { name: 'Gulbarga', state: 'Karnataka' },
  { name: 'Jamnagar', state: 'Gujarat' },
  { name: 'Ujjain', state: 'Madhya Pradesh' },
  { name: 'Loni', state: 'Uttar Pradesh' },
  { name: 'Siliguri', state: 'West Bengal' },
  { name: 'Jhansi', state: 'Uttar Pradesh' },
  { name: 'Ulhasnagar', state: 'Maharashtra' },
  { name: 'Jammu', state: 'Jammu and Kashmir' },
  { name: 'Sangli-Miraj & Kupwad', state: 'Maharashtra' },
  { name: 'Mangalore', state: 'Karnataka' },
  { name: 'Erode', state: 'Tamil Nadu' },
  { name: 'Belgaum', state: 'Karnataka' },
  { name: 'Ambattur', state: 'Tamil Nadu' },
  { name: 'Tirunelveli', state: 'Tamil Nadu' },
  { name: 'Malegaon', state: 'Maharashtra' },
  { name: 'Gaya', state: 'Bihar' },
  { name: 'Jalgaon', state: 'Maharashtra' },
  { name: 'Udaipur', state: 'Rajasthan' },
  { name: 'Maheshtala', state: 'West Bengal' }
].sort((a, b) => a.name.localeCompare(b.name));

interface CitySearchProps {
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export const CitySearch: React.FC<CitySearchProps> = ({
  placeholder = "Search Indian cities...",
  value = "",
  onValueChange,
  className,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCities, setFilteredCities] = useState(INDIAN_CITIES);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const filtered = INDIAN_CITIES.filter(city =>
        city.name.toLowerCase().includes(value.toLowerCase()) ||
        city.state.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCities(filtered);
    } else {
      setFilteredCities(INDIAN_CITIES);
    }
    setHighlightedIndex(-1);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onValueChange?.(newValue);
    setIsOpen(true);
  };

  const handleCitySelect = (city: { name: string; state: string }) => {
    onValueChange?.(city.name);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredCities.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCities.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredCities[highlightedIndex]) {
          handleCitySelect(filteredCities[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="pl-10"
          autoComplete="off"
        />
      </div>

      {isOpen && filteredCities.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-hidden"
        >
          <ScrollArea className="h-full max-h-60">
            <div className="p-1">
              {filteredCities.slice(0, 50).map((city, index) => (
                <Button
                  key={`${city.name}-${city.state}`}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-auto p-2 text-left font-normal",
                    highlightedIndex === index && "bg-accent"
                  )}
                  onClick={() => handleCitySelect(city)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium">{city.name}</span>
                      <span className="text-xs text-muted-foreground">{city.state}</span>
                    </div>
                  </div>
                </Button>
              ))}
              {filteredCities.length > 50 && (
                <div className="p-2 text-center text-sm text-muted-foreground">
                  ... and {filteredCities.length - 50} more cities
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {isOpen && filteredCities.length === 0 && value && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3"
        >
          <div className="text-center text-sm text-muted-foreground">
            No cities found matching "{value}"
          </div>
        </div>
      )}
    </div>
  );
};