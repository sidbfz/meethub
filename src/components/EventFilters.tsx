"use client";

import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EventFilters } from '@/lib/types/event';

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'Technology', label: 'Technology' },
  { value: 'Business', label: 'Business' },
  { value: 'Arts & Culture', label: 'Arts & Culture' },
  { value: 'Sports & Fitness', label: 'Sports & Fitness' },
  { value: 'Food & Drink', label: 'Food & Drink' },
  { value: 'Music', label: 'Music' },
  { value: 'Film', label: 'Film' },
  { value: 'Education', label: 'Education' },
  { value: 'Health & Wellness', label: 'Health & Wellness' },
  { value: 'Social', label: 'Social' },
  { value: 'Outdoor & Adventure', label: 'Outdoor & Adventure' },
  { value: 'Gaming', label: 'Gaming' },
  { value: 'Other', label: 'Other' },
];

interface EventFiltersProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  resultsCount?: number;
}

export default function EventFiltersComponent({ filters, onFiltersChange, resultsCount }: EventFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onFiltersChange({ ...filters, search: searchInput || undefined });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const handleCategoryChange = (category: string) => {
    onFiltersChange({
      ...filters,
      category: category === 'all' ? undefined : category,
    });
  };

  const handleDateChange = (date: string) => {
    onFiltersChange({
      ...filters,
      date: date || undefined,
    });
  };

  const clearFilters = () => {
    setSearchInput('');
    onFiltersChange({});
  };

  const hasActiveFilters = filters.category || filters.search || filters.date;

  return (
    <div className="space-y-4">
      {/* Mobile Filter Toggle */}
      <div className="md:hidden">
        <Button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          variant="outline"
          className="w-full"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters {hasActiveFilters && '•'}
        </Button>
      </div>

      {/* Desktop Filters / Mobile Collapsible */}
      <div className={`space-y-4 ${!showMobileFilters ? 'hidden md:block' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search events, locations..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <Select
            value={filters.category || 'all'}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="date"
              value={filters.date || ''}
              onChange={(e) => handleDateChange(e.target.value)}
              className="pl-10"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {/* Active Filters & Results */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4 mr-1" />
                Clear filters
              </Button>
            )}
            
            {/* Active Filter Tags */}
            <div className="flex gap-2 flex-wrap">
              {filters.category && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {categories.find(c => c.value === filters.category)?.label}
                </span>
              )}
              {filters.search && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  "{filters.search}"
                </span>
              )}
              {filters.date && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  {new Date(filters.date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Results Count */}
          {typeof resultsCount === 'number' && (
            <span className="text-sm text-gray-500">
              {resultsCount} event{resultsCount !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
