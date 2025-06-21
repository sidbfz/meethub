import React from 'react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground p-4 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          MeetHub
        </Link>
        <nav className="hidden md:flex space-x-4">
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/event/create" className="hover:underline">Create Event</Link>
          <Link href="/messages" className="hover:underline">Messages</Link>
          <Link href="/profile/edit" className="hover:underline">Profile</Link>
        </nav>
        <div className="flex items-center space-x-4">
          {/* Search Bar Placeholder */}
          <input
            type="text"
            placeholder="Search events..."
            className="px-3 py-1 rounded-md text-foreground bg-background"
          />
          {/* User Actions / Login/Register Placeholder */}
          <Link href="/login" className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md hover:bg-secondary/80">
            Login
          </Link>
          <Link href="/register" className="bg-accent text-accent-foreground px-3 py-1 rounded-md hover:bg-accent/80">
            Register
          </Link>
        </div>
      </div>
    </header>
  );
}
