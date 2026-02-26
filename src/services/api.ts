/**
 * api.ts â€” Backend API communication layer.
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

// â”€â”€ Stats & Quiz History â”€â”€

export interface UserStats {
  totalLectures: number;
  totalPagesProcessed: number;
  totalQuizAttempts: number;
  averageQuizScore: number;
  studyDaysThisMonth: number;
  recentQuizzes: { lectureFileName: string; percentage: number; grade: string; attemptedAt: string }[];
}

export async function getUserStats(accessToken: string): Promise<UserStats> {
  const res = await fetch('/api/lecture/stats', { headers: authHeaders(accessToken) });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || `Stats failed (${res.status})`);
  return data;
}

export async function getQuizHistory(accessToken: string) {
  const res = await fetch('/api/quiz/history', { headers: authHeaders(accessToken) });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || `Quiz history failed (${res.status})`);
  return data || [];
}

// â”€â”€ Lecture endpoints â”€â”€

export async function uploadLectureForSummary(file: File, accessToken: string) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/lecture/summarize', { method: 'POST', headers: authHeaders(accessToken), body: formData });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  if (!data) throw new Error('Server returned an empty response.');
  return data;
}

export type ProcessMode = 'summary' | 'chat' | 'quiz';

export interface ProcessResponse {
  lectureId: string;
  mode: ProcessMode;
  /** "complete" for summary mode; "indexing_complete" for chat/quiz (async summary running) */
  status: 'complete' | 'indexing_complete';
  fileName: string;
  pageCount: number;
  chunksIndexed: number;
  /** Only present when mode="summary" â€” full nested summary data */
  summary?: any;
}

/**
 * Smart Upload â€” processes a PDF according to the chosen mode:
 * - "summary" â†’ full sync pipeline, returns complete AI summary
 * - "chat"    â†’ extract + RAG-index synchronously, async summarize, returns lectureId fast
 * - "quiz"    â†’ same as chat
 */
export async function processLectureByMode(
  file: File,
  mode: ProcessMode,
  accessToken: string
): Promise<ProcessResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`/api/lecture/process?mode=${mode}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: formData,
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || `Processing failed (${res.status})`);
  if (!data) throw new Error('Server returned an empty response.');
  return data;
}



export interface QuickIndexResponse {
  lectureId: string;
  fileName: string;
  pageCount: number;
  chunksIndexed: number;
  mode: string;
}

/**
 * "Quick Mode" upload â€” indexes the PDF into the RAG store WITHOUT generating a summary.
 * Much faster than uploadLectureForSummary. The returned lectureId can immediately be used
 * for Q&A (/api/lecture/{id}/ask) and quiz generation (/api/quiz/{id}/generate).
 */
export async function quickIndexLecture(file: File, accessToken: string): Promise<QuickIndexResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/lecture/index', { method: 'POST', headers: authHeaders(accessToken), body: formData });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || `Quick index failed (${res.status})`);
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
  provider?: string;
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

// -- Streaming Summarization --

/**
 * Triggers streaming summarization for a lecture.
 * Returns 202 ACCEPTED - actual summary streams via WebSocket.
 * Client must subscribe to /topic/lectures/{lectureId} BEFORE calling this.
 */
export async function triggerStreamingSummary(
  lectureId: string,
  accessToken: string
): Promise<{ status: string; lectureId: string; message: string }> {
  const res = await fetch(`/api/lecture/${lectureId}/summarize-stream`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || `Streaming failed (${res.status})`);
  return data;
}

// â”€â”€ RAG Q&A â”€â”€

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

// â”€â”€ Quiz â”€â”€

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
