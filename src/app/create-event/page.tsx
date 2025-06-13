import CreateEventForm from "@/components/CreateEventForm";

export default function CreateEventPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Create New Event
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Fill out the form below to create a new event
            </p>
          </div>
          
          <CreateEventForm />
        </div>
      </div>
    </div>
  );
}