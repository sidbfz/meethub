// src/components/events/event-filters.tsx
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ChevronDown, Search } from 'lucide-react';
import { useEventStore } from '@/store/events-store';
import { useDebounce } from '@/lib/utils'; // Assuming useDebounce is in utils.ts

export function EventFilters() {
  const { filters, setCategoryFilter, setLocationFilter, setDateFilter, setParticipantsFilter, setSortBy, fetchEvents } = useEventStore();

  const [locationInput, setLocationInput] = useState(filters.location);
  const debouncedLocation = useDebounce(locationInput, 500);

  useEffect(() => {
    setLocationFilter(debouncedLocation);
  }, [debouncedLocation, setLocationFilter]);

  useEffect(() => {
    fetchEvents(); // Fetch events whenever filters change
  }, [filters, fetchEvents]);

  const categories = ['Technology', 'Photography', 'Wellness', 'Arts', 'Sports', 'Food'];
  const sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'popularity', label: 'Popularity' },
    { value: 'distance', label: 'Distance' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-lg shadow-sm mb-6">
      {/* Category Dropdown */}
      <Select value={filters.category} onValueChange={setCategoryFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Categories</SelectItem>
          {categories.map(cat => (
            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Location Input */}
      <div className="relative flex-grow max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Location"
          className="pl-9"
          value={locationInput}
          onChange={(e) => setLocationInput(e.target.value)}
        />
      </div>

      {/* Date Picker Placeholder */}
      <Input
        type="date"
        placeholder="Date"
        className="w-[180px]"
        value={filters.date}
        onChange={(e) => setDateFilter(e.target.value)}
      />

      {/* Participants Slider */}
      <div className="w-[200px]">
        <p className="text-sm text-muted-foreground mb-2">Participants: {filters.participants[0]} - {filters.participants[1]}</p>
        <Slider
          min={0}
          max={500}
          step={10}
          value={filters.participants}
          onValueChange={(val: [number, number]) => setParticipantsFilter(val)}
        />
      </div>

      {/* Sort By Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            Sort by: {sortOptions.find(opt => opt.value === filters.sortBy)?.label} <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sortOptions.map(option => (
            <DropdownMenuItem key={option.value} onClick={() => setSortBy(option.value as 'date' | 'popularity' | 'distance')}>
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" onClick={() => {
        setCategoryFilter('');
        setLocationInput('');
        setDateFilter('');
        setParticipantsFilter([0, 100]);
        setSortBy('date');
      }}>
        Reset Filters
      </Button>
    </div>
  );
}
