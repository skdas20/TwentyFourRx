"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  field: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function AutocompleteInput({
  value,
  onChange,
  field,
  placeholder,
  required = false,
  className = "",
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch suggestions
  const fetchSuggestions = async (query: string) => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
      const queryParam = query ? `&q=${encodeURIComponent(query)}` : '';
      const response = await fetch(
        `${apiUrl}/medicine-references/suggestions?field=${field}${queryParam}`
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      } else {
        console.error("Failed to fetch suggestions:", response.status, response.statusText);
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for fetching suggestions
    debounceTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleFocus = () => {
    // Always fetch suggestions on focus, even without value
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    } else {
      fetchSuggestions(value || '');
      setShowSuggestions(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          required={required}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          className={className}
          placeholder={placeholder}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 first:rounded-t-lg last:rounded-b-lg transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {showSuggestions && !loading && suggestions.length === 0 && value.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg px-4 py-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No suggestions found. You can enter a new value.
          </p>
        </div>
      )}
    </div>
  );
}
