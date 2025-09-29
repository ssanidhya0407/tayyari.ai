// This file centralizes access to environment variables and API keys

/**
 * Configuration for API access, environment variables, and other settings
 * This helps ensure consistent access to environment variables across the app
 */
export const ApiConfig = {
  /**
   * Google Generative AI (Gemini) API Key
   * Used for AI features in the learning assistant
   */
  GEMINI_API_KEY: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
  
  /**
   * Backend API URL
   * Used for making requests to the Flask backend
   */
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  
  /**
   * Unsplash Access Key
   * Used for generating relevant images
   */
  UNSPLASH_ACCESS_KEY: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || '',
  
  /**
   * Uploadcare Public Key
   * Used for file uploads
   */
  UPLOADCARE_PUBLIC_KEY: process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY || '',
};

/**
 * Checks if the necessary API keys are present and logs warnings if any are missing
 * @returns boolean indicating if all critical keys are available
 */
export function validateApiKeys(): boolean {
  const missingKeys: string[] = [];
  
  if (!ApiConfig.GEMINI_API_KEY) {
    console.error('Missing NEXT_PUBLIC_GEMINI_API_KEY - AI learning features will not work');
    missingKeys.push('GEMINI_API_KEY');
  }
  
  if (!ApiConfig.API_URL) {
    console.error('Missing NEXT_PUBLIC_API_URL - Using default localhost:5000');
  }
  
  if (!ApiConfig.UNSPLASH_ACCESS_KEY) {
    console.warn('Missing NEXT_PUBLIC_UNSPLASH_ACCESS_KEY - Image features may be limited');
  }
  
  if (!ApiConfig.UPLOADCARE_PUBLIC_KEY) {
    console.warn('Missing NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY - File upload features may be limited');
  }
  
  return missingKeys.length === 0;
}