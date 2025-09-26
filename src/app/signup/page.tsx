import SignupForm from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Welcome to MeetHub
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Create your account to get started
          </p>
        </div>
          <SignupForm />
        
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <a href="/login" className="text-blue-600 hover:underline">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
