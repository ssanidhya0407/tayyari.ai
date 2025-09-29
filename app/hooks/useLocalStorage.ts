import { useState } from 'react';

// Generic hook for localStorage-backed state
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Read from localStorage or use initialValue
  const readValue = () => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Update localStorage and state
  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      // Ignore write errors
    }
  };

  return [storedValue, setValue];
}

export default useLocalStorage;
