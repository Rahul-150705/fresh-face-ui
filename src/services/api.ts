/**
 * api.ts — Backend API communication layer.
 * Attaches the JWT access token to all protected requests.
 */

const BASE_URL = '/api/lecture';

/**
 * Safely parse JSON from a response.
 */
async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text || text.trim() === '') return null;
  try {
    return JSON.parse(text);
  } catch {
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
    headers: { 'Authorization': `Bearer ${accessToken}` },
    body: formData,
  });

  const data = await safeJson(response);
  if (!response.ok) throw new Error(data?.error || `Request failed with status ${response.status}`);
  if (!data) throw new Error('Server returned an empty response. Please try again.');
  return data;
}

/**
 * Health check (public endpoint).
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

/**
 * Ask a question about a lecture (RAG Q&A).
 */
export interface AskQuestionResponse {
  lectureId: string;
  question: string;
  answer: string;
  sourceChunks: string[];
  chunksUsed: number;
}

export async function askQuestion(lectureId: string, question: string, accessToken: string): Promise<AskQuestionResponse> {
  const response = await fetch(`/api/lecture/${lectureId}/ask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  });
  const data = await safeJson(response);
  if (!response.ok) throw new Error(data?.error || `Q&A request failed (${response.status})`);
  if (!data) throw new Error('Server returned an empty response.');
  return data;
}

/**
 * Get lecture history.
 */
export interface LectureHistoryItem {
  id: string;
  fileName: string;
  processedAt: string;
  pageCount: number;
}

export async function getLectureHistory(accessToken: string): Promise<LectureHistoryItem[]> {
  const response = await fetch(`/api/lecture/history`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const data = await safeJson(response);
  if (!response.ok) throw new Error(data?.error || `Failed to fetch history (${response.status})`);
  return data || [];
}

/**
 * Delete a lecture.
 */
export async function deleteLecture(lectureId: string, accessToken: string) {
  const response = await fetch(`/api/lecture/${lectureId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const data = await safeJson(response);
  if (!response.ok) throw new Error(data?.error || `Delete failed (${response.status})`);
  return data;
}
