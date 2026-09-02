/**
 * Frontend Configuration
 * Centralized place for API URLs and other environment-specific settings.
 */

// Use Vite environment variables (from .env.development or .env.production)
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Helpful for WebSocket connections which need the same base URL
export const WS_BASE_URL = BASE_URL;

// The active model name displayed in the UI
export const ACTIVE_MODEL = import.meta.env.VITE_ACTIVE_MODEL || 'phi3:latest';
