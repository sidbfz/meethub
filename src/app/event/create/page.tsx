// File: src/components/events/event-form.tsx
import React from 'react';

// Define and directly export your EventForm component as the default export
export default function EventForm() { // Changed to default export
  return (
    <form className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      {/* Your form elements go here */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="eventName">
          Event Name
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="eventName"
          type="text"
          placeholder="My Awesome Event"
        />
      </div>
      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="eventDate">
          Date
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="eventDate"
          type="date"
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          type="button"
        >
          Create Event
        </button>
      </div>
    </form>
  );
}
