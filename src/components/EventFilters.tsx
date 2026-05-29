"use client";

import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
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

// Custom DatePicker using shadcn components - now imported from ui/date-picker

// Search Input Component
interface SearchInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	size?: 'sm' | 'default';
}

const SearchInput: React.FC<SearchInputProps> = ({
	value,
	onChange,
	placeholder = "Search...",
	className,
	size = 'default'
}) => {
	return (
		<div className={cn("relative", className)}>
			<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
			<Input
				type="text"
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className={cn(
					"pl-10 bg-white/70 border-white/50 placeholder:text-muted-foreground focus:bg-white focus:border-blue-400 hover:border-blue-400 transition-colors",
					size === 'sm' ? "h-8" : "h-9"
				)}
			/>
		</div>
	);
};

// Category Select Component
interface CategorySelectProps {
	value: string;
	onChange: (value: string) => void;
	className?: string;
	size?: 'sm' | 'default';
	showIcon?: boolean;
}

const CategorySelect: React.FC<CategorySelectProps> = ({
	value,
	onChange,
	className,
	size = 'default',
	showIcon = false
}) => {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger 
				className={cn(
					"bg-white/70 border-white/50 data-[state=open]:bg-white data-[state=open]:border-blue-400 hover:border-blue-400 transition-colors",
					size === 'sm' ? "h-8" : "h-9",
					showIcon && "pl-2",
					className
				)}
			>
				{showIcon ? (
					<div className="flex items-center gap-1">
						<Filter className="h-4 w-4 text-muted-foreground" />
						<span className="text-sm text-muted-foreground">Category</span>
					</div>
				) : (
					<SelectValue placeholder="Category" />
				)}
			</SelectTrigger>
			<SelectContent>
				{categories.map((category) => (
					<SelectItem key={category.value} value={category.value}>
						{category.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};

// Results Counter Component
interface ResultsCounterProps {
	count: number | undefined;
	className?: string;
	size?: 'sm' | 'default';
}

const ResultsCounter: React.FC<ResultsCounterProps> = ({ count, className, size = 'default' }) => {
	return (
		<div className={cn(
			"bg-white/70 backdrop-blur-md border border-white/50 rounded-md px-4 flex items-center justify-center transition-colors",
			size === 'sm' ? "h-8" : "h-9",
			className
		)}>
			<div className="text-sm text-gray-700 font-semibold whitespace-nowrap">
				{count !== undefined ? (
					<span>{count} event{count !== 1 ? 's' : ''} found</span>
				) : (
					<span className="animate-pulse">Loading...</span>
				)}
			</div>
		</div>
	);
};

// Filter Tags Component
interface FilterTagsProps {
	filters: EventFilters;
	onClearFilters: () => void;
	categories: { value: string; label: string }[];
}

const FilterTags: React.FC<FilterTagsProps> = ({ filters, onClearFilters, categories }) => {
	const hasActiveFilters = filters.category || filters.search || filters.date;

	if (!hasActiveFilters) return null;

	return (
		<div className="flex items-center gap-2 flex-wrap mt-3">
			<Button
				onClick={onClearFilters}
				variant="ghost"
				size="sm"
				className="text-muted-foreground hover:text-foreground h-6"
			>
				<X className="w-3 h-3 mr-1" />
				Clear filters
			</Button>
			<div className="flex gap-2 flex-wrap">
				{filters.category && (
					<Badge variant="secondary" className="bg-blue-100 text-blue-800">
						{categories.find(c => c.value === filters.category)?.label}
					</Badge>
				)}
				{filters.search && (
					<Badge variant="secondary" className="bg-green-100 text-green-800">
						"{filters.search}"
					</Badge>
				)}
				{filters.date && (
					<Badge variant="secondary" className="bg-purple-100 text-purple-800">
						{new Date(filters.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
					</Badge>
				)}
			</div>
		</div>
	);
};

// Main Component
interface EventFiltersProps {
	filters: EventFilters;
	onFiltersChange: (filters: EventFilters) => void;
	resultsCount?: number;
}

export default function EventFiltersComponent({ filters, onFiltersChange, resultsCount }: EventFiltersProps) {
	const [searchInput, setSearchInput] = useState(filters.search || '');

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
	};	return (
		<div className="w-full">
			{/* Mobile Layout */}
			<div className="block md:hidden">
				<div className="flex gap-3 items-center mb-3 flex-wrap justify-center">
					<SearchInput
						value={searchInput}
						onChange={setSearchInput}
						placeholder="Search"
						className="flex-1 min-w-[120px]"
						size="sm"
					/>
					<CategorySelect
						value={filters.category || 'all'}
						onChange={handleCategoryChange}
						className="w-28 flex-shrink-0"
						size="sm"
						showIcon={true}
					/>
					<DatePicker
						value={filters.date}
						onChange={handleDateChange}
						className="w-28 flex-shrink-0"
						size="sm"
					/>
				</div>
				<div className="flex justify-center">
					<ResultsCounter 
						count={resultsCount}
						size="sm"
					/>
				</div>
			</div>			{/* Desktop Layout */}
			<div className="hidden md:block">
				<div className="flex items-center gap-3 mb-3">
					<div className="flex-1">
						<div className="flex gap-3 items-center flex-wrap">
							<SearchInput
								value={searchInput}
								onChange={setSearchInput}
								placeholder="Search events, address, city..."
								className="flex-1 min-w-[200px]"
							/>
							<CategorySelect
								value={filters.category || 'all'}
								onChange={handleCategoryChange}
								className="w-40"
							/>
							<DatePicker
								value={filters.date}
								onChange={handleDateChange}
								className="w-36"
							/>
						</div>
					</div>

					<ResultsCounter 
						count={resultsCount}
						className="min-w-[140px]"
					/>
				</div>
				
				<FilterTags
					filters={filters}
					onClearFilters={clearFilters}
					categories={categories}
				/>
			</div>
		</div>
	);
}
