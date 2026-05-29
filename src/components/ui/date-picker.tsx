"use client";

import { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Helper to format a Date object to a local 'YYYY-MM-DDTHH:mm' string
const toLocalISOString = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// DateTime Picker Component for Event Forms
interface DateTimePickerProps {
  value: string | undefined;
  onChange: (dateTime: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ 
  value, 
  onChange, 
  className,
  placeholder = "Select date and time",
  disabled = false
}) => {
  const [date, setDate] = useState<Date | undefined>(value ? new Date(value) : undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // When the value prop changes, update the internal date state.
    // This handles both initial data loading and external updates.
    if (value) {
      const parsedDate = new Date(value);
      if (!isNaN(parsedDate.getTime())) {
        setDate(parsedDate);
      }
    } else {
      setDate(undefined);
    }
  }, [value]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;

    const newDate = date ? new Date(date) : new Date();
    newDate.setFullYear(selectedDate.getFullYear());
    newDate.setMonth(selectedDate.getMonth());
    newDate.setDate(selectedDate.getDate());
    
    setDate(newDate);
    onChange(toLocalISOString(newDate));
  };

  const handleHourChange = (hour12: string) => {
    const newDate = date ? new Date(date) : new Date();
    const selectedHour12 = parseInt(hour12, 10);
    const isPM = newDate.getHours() >= 12;
    
    let newHour24;
    if (isPM) {
      newHour24 = selectedHour12 === 12 ? 12 : selectedHour12 + 12;
    } else {
      newHour24 = selectedHour12 === 12 ? 0 : selectedHour12;
    }
    
    newDate.setHours(newHour24);
    setDate(newDate);
    onChange(toLocalISOString(newDate));
  };

  const handleMinuteChange = (minute: string) => {
    const newDate = date ? new Date(date) : new Date();
    newDate.setMinutes(parseInt(minute, 10));
    setDate(newDate);
    onChange(toLocalISOString(newDate));
  };

  const handlePeriodChange = (period: 'AM' | 'PM') => {
    const newDate = date ? new Date(date) : new Date();
    let hours = newDate.getHours();
    if (period === 'PM' && hours < 12) {
      hours += 12;
    } else if (period === 'AM' && hours >= 12) {
      hours -= 12;
    }
    newDate.setHours(hours);
    setDate(newDate);
    onChange(toLocalISOString(newDate));
  };

  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return placeholder;
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return placeholder;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const selectedHour = date ? (date.getHours() % 12 || 12).toString() : '1';
  const selectedMinute = date ? date.getMinutes().toString().padStart(2, '0') : '00';
  const selectedPeriod = date ? (date.getHours() >= 12 ? 'PM' : 'AM') : 'AM';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="mr-2">{value ? formatDateTime(value) : placeholder}</span>
          <Clock className="ml-auto h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
          disabled={(d) => d < new Date(new Date().setDate(new Date().getDate() - 1))}
        />        <div className="p-3 border-t border-border flex items-center justify-center gap-2">
          <Select onValueChange={handleHourChange} value={selectedHour}>
            <SelectTrigger className="w-[65px] focus:ring-blue-400"><SelectValue /></SelectTrigger>
            <SelectContent position="popper" sideOffset={5} className="h-[400px] overflow-y-auto">
              {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
          :
          <Select onValueChange={handleMinuteChange} value={selectedMinute}>
            <SelectTrigger className="w-[65px] focus:ring-blue-400"><SelectValue /></SelectTrigger>
            <SelectContent position="popper" sideOffset={5} className="h-[400px] overflow-y-auto">
              {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select onValueChange={handlePeriodChange} value={selectedPeriod}>
            <SelectTrigger className="w-[70px] focus:ring-blue-400"><SelectValue /></SelectTrigger>
            <SelectContent position="popper" sideOffset={5}>
              {['AM', 'PM'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Date Picker Component (existing from EventFilters)
interface DatePickerProps {
  value: string | undefined;
  onChange: (date: string) => void;
  className?: string;
  placeholder?: string;
  size?: 'sm' | 'default';
  disabled?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({ 
  value, 
  onChange, 
  className,
  placeholder = "Date",
  size = 'default',
  disabled = false
}) => {
  const [open, setOpen] = useState(false);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const day = selectedDate.getDate().toString().padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
    } else {
      onChange('');
    }
    setOpen(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return placeholder;
    // Replacing dashes with slashes makes new Date() parse it as local time, not UTC
    const date = new Date(dateStr.replace(/-/g, '\/'));
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: size === 'sm' ? undefined : 'numeric'
    });
  };

  const selectedDate = value ? new Date(value.replace(/-/g, '\/')) : undefined;

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal bg-white/70 border-white/50 hover:bg-white hover:border-blue-400",
              !value && "text-muted-foreground",
              size === 'sm' ? "h-8 px-2" : "h-9 px-3",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="text-sm">{value ? formatDate(value) : placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            disabled={(date: Date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
