// Utility functions for event status management

export function getComputedEventStatus(event: { status: string; date_time: string }): string {
  // Auto-determine if event should be concluded
  const eventDateTime = new Date(event.date_time);
  const fourHoursAfterEvent = new Date(eventDateTime.getTime() + (4 * 60 * 60 * 1000));
  const now = new Date();
  
  // If event is approved but 4 hours have passed since event time, mark as concluded
  if (event.status === 'approved' && now > fourHoursAfterEvent) {
    return 'concluded';
  }
  
  return event.status;
}

export function shouldEventBeConcluded(event: { status: string; date_time: string }): boolean {
  if (event.status !== 'approved') {
    return false;
  }
  
  const eventDateTime = new Date(event.date_time);
  const fourHoursAfterEvent = new Date(eventDateTime.getTime() + (4 * 60 * 60 * 1000));
  const now = new Date();
  
  return now > fourHoursAfterEvent;
}

export function getEventStatusDisplay(status: string): { text: string; color: string } {
  switch (status) {
    case 'approved':
      return { text: 'Live', color: 'text-green-600 border-green-300' };
    case 'concluded':
      return { text: 'Concluded', color: 'text-blue-600 border-blue-300' };
    case 'cancelled':
      return { text: 'Cancelled', color: 'text-red-600 border-red-300' };
    default:
      return { text: status, color: 'text-gray-600 border-gray-300' };
  }
}
