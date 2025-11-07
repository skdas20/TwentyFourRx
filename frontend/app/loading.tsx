import { Pill } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-3">
        {/* Rotating Pill Icon */}
        <div className="animate-spin">
          <Pill className="w-12 h-12 text-blue-600 dark:text-blue-400" />
        </div>
        
        {/* Optional loading text */}
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Loading...</p>
      </div>
    </div>
  );
}