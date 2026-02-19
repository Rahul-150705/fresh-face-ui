/**
 * api.ts — Backend API communication layer.
 * Attaches the JWT access token to all protected requests.
 */

const BASE_URL = '/api/lecture';

/**
 * Upload a PDF and receive an AI-generated summary.
 */
export async function uploadLectureForSummary(file: File, accessToken: string) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BASE_URL}/summarize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data?.error || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

/**
 * Health check (public endpoint — no token required).
 */
export async function checkHealth() {
  const response = await fetch(`${BASE_URL}/health`);
  if (!response.ok) throw new Error('Backend service is unavailable.');
  return response.json();
}
