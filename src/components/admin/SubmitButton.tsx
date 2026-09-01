"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ 
  idleText, 
  loadingText, 
  className 
}: { 
  idleText: string; 
  loadingText: string; 
  className?: string; 
}) {
  const { pending } = useFormStatus();

  return (
    <button 
      type="submit" 
      disabled={pending} 
      className={`disabled:opacity-50 disabled:cursor-not-allowed transition-all ${className}`}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          {loadingText}
        </span>
      ) : (
        idleText
      )}
    </button>
  );
}
