// src/app/event/create/page.tsx
import React from 'react';
import { EventForm } from '@/components/events/event-form'; // Will create this

export default function CreateEventPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Create New Event</h1>
      <EventForm />
    </div>
  );
}
