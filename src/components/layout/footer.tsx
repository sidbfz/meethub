import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-card text-card-foreground p-4 border-t">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between text-sm">
        <p>&copy; {new Date().getFullYear()} MeetHub. All rights reserved.</p>
        <nav className="flex space-x-4 mt-2 md:mt-0">
          <Link href="/about" className="hover:underline">About</Link>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          <Link href="/contact" className="hover:underline">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
