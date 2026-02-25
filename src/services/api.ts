/**
 * api.ts — Backend API communication layer.
 */

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text || text.trim() === '') return null;
  try { return JSON.parse(text); } catch { return { error: text }; }
}

function authHeaders(token: string): Record<string, string> {
  return { 'Authorization': `Bearer ${token}` };
}

function jsonHeaders(token: string): Record<string, string> {
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ── Lecture endpoints ──

export async function uploadLectureForSummary(file: File, accessToken: string) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/lecture/summarize', { method: 'POST', headers: authHeaders(accessToken), body: formData });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  if (!data) throw new Error('Server returned an empty response.');
  return data;
}

export async function checkHealth() {
  const res = await fetch('/api/lecture/health');
  const data = await safeJson(res);
  if (!res.ok) throw new Error('Backend unavailable');
  return data;
}

export interface LectureHistoryItem {
  id: string;
  fileName: string;
  processedAt: string;
  pageCount: number;
}

export async function getLectureHistory(accessToken: string): Promise<LectureHistoryItem[]> {
  const res = await fetch('/api/lecture/history', { headers: authHeaders(accessToken) });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || `Failed to fetch history (${res.status})`);
  return data || [];
}

export async function getLecture(lectureId: string, accessToken: string) {
  const res = await fetch(`/api/lecture/${lectureId}`, { headers: authHeaders(accessToken) });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || `Failed to fetch lecture (${res.status})`);
  return data;
}

export async function deleteLecture(lectureId: string, accessToken: string) {
  const res = await fetch(`/api/lecture/${lectureId}`, { method: 'DELETE', headers: authHeaders(accessToken) });
  if (!res.ok) { const data = await safeJson(res); throw new Error(data?.error || `Delete failed (${res.status})`); }
}

export async function reindexLecture(lectureId: string, accessToken: string) {
  const res = await fetch(`/api/lecture/${lectureId}/reindex`, { method: 'POST', headers: authHeaders(accessToken) });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || `Reindex failed (${res.status})`);
  return data;
}

// ── RAG Q&A ──

export interface AskQuestionResponse {
  lectureId: string;
  question: string;
  answer: string;
  sourceChunks: string[];
  chunksUsed: number;
}

export async function askQuestion(lectureId: string, question: string, accessToken: string): Promise<AskQuestionResponse> {
  const res = await fetch(`/api/lecture/${lectureId}/ask`, { method: 'POST', headers: jsonHeaders(accessToken), body: JSON.stringify({ question }) });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || `Q&A failed (${res.status})`);
  if (!data) throw new Error('Server returned an empty response.');
  return data;
}

// ── Quiz ──

export async function generateQuiz(lectureId: string, accessToken: string, numQuestions = 10) {
  const res = await fetch(`/api/quiz/${lectureId}/generate?numQuestions=${numQuestions}`, { method: 'POST', headers: authHeaders(accessToken) });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || `Quiz generation failed (${res.status})`);
  if (!data) throw new Error('Server returned an empty response.');
  return data;
}

export async function submitQuizAnswers(lectureId: string, answers: string[], accessToken: string) {
  const res = await fetch(`/api/quiz/${lectureId}/submit`, { method: 'POST', headers: jsonHeaders(accessToken), body: JSON.stringify({ answers }) });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || `Quiz submission failed (${res.status})`);
  if (!data) throw new Error('Server returned an empty response.');
  return data;
}
