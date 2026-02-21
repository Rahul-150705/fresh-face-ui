/**
 * api.ts — Backend API communication layer.
 * Attaches the JWT access token to all protected requests.
 */

const BASE_URL = '/api/lecture';

/**
 * Safely parse JSON from a response.
 * Returns null if the body is empty or not JSON (avoids "Unexpected end of JSON input").
 */
async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text || text.trim() === '') return null;
  try {
    return JSON.parse(text);
  } catch {
    // Backend returned non-JSON (e.g. plain text error or HTML)
    return { error: text };
  }
}

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
      // Do NOT set Content-Type — browser sets multipart boundary automatically
    },
    body: formData,
  });

  const data = await safeJson(response);

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  if (!data) {
    throw new Error('Server returned an empty response. Please try again.');
  }

  return data;
}

/**
 * Health check (public endpoint — no token required).
 */
export async function checkHealth() {
  const response = await fetch(`${BASE_URL}/health`);
  const data = await safeJson(response);
  if (!response.ok) throw new Error('Backend service is unavailable.');
  return data;
}

/**
 * Generate a quiz from a lecture.
 */
export async function generateQuiz(lectureId: string, accessToken: string, numQuestions = 10) {
  const response = await fetch(`/api/quiz/${lectureId}/generate?numQuestions=${numQuestions}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const data = await safeJson(response);
  if (!response.ok) throw new Error(data?.error || `Quiz generation failed (${response.status})`);
  if (!data) throw new Error('Server returned an empty response.');
  return data;
}

/**
 * Submit quiz answers and get results.
 */
export async function submitQuizAnswers(lectureId: string, answers: string[], accessToken: string) {
  const response = await fetch(`/api/quiz/${lectureId}/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ answers }),
  });
  const data = await safeJson(response);
  if (!response.ok) throw new Error(data?.error || `Quiz submission failed (${response.status})`);
  if (!data) throw new Error('Server returned an empty response.');
  return data;
}