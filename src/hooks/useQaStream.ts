import { useState, useEffect, useRef, useCallback } from 'react';
import SockJS from 'sockjs-client';
import { Client, type IMessage } from '@stomp/stompjs';
import { BASE_URL } from '../config';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Mirrors SummaryStreamPayload but for Q&A messages. */
interface QaStreamPayload {
    type: 'ANSWER_CHUNK' | 'ANSWER_COMPLETED' | 'ANSWER_ERROR';
    lectureId: string;
    chunk?: string;
    fullAnswer?: string;
    question?: string;
    sourceChunks?: string[];
    chunksUsed?: number;
    error?: string;
}

export interface QaStreamMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sourceChunks?: string[];
    chunksUsed?: number;
    timestamp: Date;
    /** True while tokens are still arriving for this message bubble. */
    isStreaming?: boolean;
    isCached?: boolean;
}

export interface UseQaStreamReturn {
    messages: QaStreamMessage[];
    isStreaming: boolean;
    isConnected: boolean;
    error: string | null;
    askQuestion: (question: string) => Promise<void>;
    clearMessages: () => void;
    stopStream: () => void;
}

// ── Drip speed — identical to useSummaryStream ────────────────────────────────
/** Milliseconds between each drip tick. Keep in sync with useSummaryStream. */
const DRIP_DELAY_MS = 18;

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useQaStream — exact mirror of useSummaryStream for the Q&A channel.
 *
 * Architecture:
 *  1. Connect to /ws/lectures via SockJS + STOMP
 *  2. Subscribe to /topic/lectures/{lectureId}/qa
 *  3. Buffer incoming ANSWER_CHUNK tokens in wordQueueRef
 *  4. Drip them into the live message bubble at DRIP_DELAY_MS per word
 *     (batch-flush when backlogged, one-at-a-time when caught up)
 *  5. Defer ANSWER_COMPLETED until the drip queue is empty, then attach
 *     source chunks to the completed message
 *  6. Handle ANSWER_ERROR inline inside the assistant message bubble
 *
 * @param lectureId   UUID of the lecture
 * @param authToken   JWT access token used for the REST trigger call
 * @param backendUrl  Base URL of the Spring Boot backend
 */
export function useQaStream(
    lectureId: string | null | undefined,
    authToken: string | null,
    backendUrl = BASE_URL
): UseQaStreamReturn {

    const [messages, setMessages] = useState<QaStreamMessage[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const stompClientRef = useRef<Client | null>(null);
    const inFlightRef = useRef(false);

    // ── Drip-feed buffer (same shape as useSummaryStream) ────────────────────
    const wordQueueRef = useRef<string[]>([]);
    const dripTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pendingCompleteRef = useRef<{
        sourceChunks: string[];
        chunksUsed: number;
    } | null>(null);
    /** ID of the assistant message bubble currently receiving tokens. */
    const currentAssistantIdRef = useRef<string | null>(null);

    // ── startDrip — identical logic to useSummaryStream ──────────────────────
    const startDrip = useCallback(() => {
        if (dripTimerRef.current) return;

        dripTimerRef.current = setInterval(() => {
            // Queue empty — stop the timer
            if (wordQueueRef.current.length === 0) {
                clearInterval(dripTimerRef.current!);
                dripTimerRef.current = null;

                // Apply deferred ANSWER_COMPLETED once queue drains
                if (pendingCompleteRef.current !== null) {
                    const { sourceChunks, chunksUsed } = pendingCompleteRef.current;
                    pendingCompleteRef.current = null;

                    if (currentAssistantIdRef.current) {
                        setMessages(prev =>
                            prev.map(m =>
                                m.id === currentAssistantIdRef.current
                                    ? { ...m, sourceChunks, chunksUsed, isStreaming: false }
                                    : m
                            )
                        );
                    }
                    setIsStreaming(false);
                    inFlightRef.current = false;
                }
                return;
            }

            // Batch-flush when backlogged to prevent visible paste bursts;
            // otherwise drip one word at a time for the smooth typing effect.
            // (Same thresholds as useSummaryStream: >30 words → flush 3 at once)
            const batchSize = wordQueueRef.current.length > 30 ? 3 : 1;
            const words = wordQueueRef.current.splice(0, batchSize);
            const text = words.join('');

            if (currentAssistantIdRef.current) {
                setMessages(prev =>
                    prev.map(m =>
                        m.id === currentAssistantIdRef.current
                            ? { ...m, content: m.content + text }
                            : m
                    )
                );
            }
        }, DRIP_DELAY_MS);
    }, []);

    // ── flushDrip — identical to useSummaryStream ─────────────────────────────
    const flushDrip = useCallback(() => {
        if (dripTimerRef.current) {
            clearInterval(dripTimerRef.current);
            dripTimerRef.current = null;
        }
        if (wordQueueRef.current.length > 0 && currentAssistantIdRef.current) {
            const remaining = wordQueueRef.current.join('');
            wordQueueRef.current = [];
            setMessages(prev =>
                prev.map(m =>
                    m.id === currentAssistantIdRef.current
                        ? { ...m, content: m.content + remaining }
                        : m
                )
            );
        }
        wordQueueRef.current = [];
    }, []);

    // Cleanup drip timer on unmount
    useEffect(() => {
        return () => {
            if (dripTimerRef.current) {
                clearInterval(dripTimerRef.current);
                dripTimerRef.current = null;
            }
        };
    }, []);

    // Reset all drip state when lectureId changes (same as useSummaryStream)
    useEffect(() => {
        inFlightRef.current = false;
        flushDrip();
        wordQueueRef.current = [];
        pendingCompleteRef.current = null;
        currentAssistantIdRef.current = null;
    }, [lectureId, flushDrip]);

    // ── 1. WebSocket connection + subscription ────────────────────────────────

    useEffect(() => {
        if (!lectureId) return;

        const client = new Client({
            // SockJS transport — auto-fallback to HTTP long-polling
            webSocketFactory: () => new SockJS(`${backendUrl}/ws/lectures`),
            reconnectDelay: 5000,

            onConnect: () => {
                console.log('[QA WS] STOMP connected');
                setIsConnected(true);

                client.subscribe(
                    `/topic/qa/${lectureId}`,
                    (message: IMessage) => {
                        try {
                            const payload: QaStreamPayload = JSON.parse(message.body);

                            switch (payload.type) {

                                case 'ANSWER_CHUNK': {
                                    let chunk = payload.chunk ?? '';
                                    if (!chunk) break;

                                    // Intercept FAQ Cache flag
                                    const cacheFlag = '*⚡ Served from FAQ Cache*\n\n';
                                    const cacheFlagFallback = '*⚡ Served from FAQ Cache*';
                                    if (chunk.includes(cacheFlag) || chunk.includes(cacheFlagFallback)) {
                                        chunk = chunk.replace(cacheFlag, '').replace(cacheFlagFallback, '');
                                        if (currentAssistantIdRef.current) {
                                            setMessages(prev =>
                                                prev.map(m =>
                                                    m.id === currentAssistantIdRef.current
                                                        ? { ...m, isCached: true }
                                                        : m
                                                )
                                            );
                                        }
                                    }

                                    // Split into word-level tokens preserving whitespace —
                                    // identical to useSummaryStream's split strategy
                                    const tokens = chunk.split(/(\s+)/);
                                    wordQueueRef.current.push(...tokens);
                                    startDrip();
                                    setIsStreaming(true);
                                    break;
                                }

                                case 'ANSWER_COMPLETED': {
                                    const sourceChunks = payload.sourceChunks ?? [];
                                    const chunksUsed = payload.chunksUsed ?? 0;

                                    // If still dripping, defer completion —
                                    // same pattern as useSummaryStream's pendingCompleteRef
                                    if (wordQueueRef.current.length > 0 || dripTimerRef.current) {
                                        pendingCompleteRef.current = { sourceChunks, chunksUsed };
                                    } else {
                                        if (currentAssistantIdRef.current) {
                                            setMessages(prev =>
                                                prev.map(m =>
                                                    m.id === currentAssistantIdRef.current
                                                        ? { ...m, sourceChunks, chunksUsed, isStreaming: false }
                                                        : m
                                                )
                                            );
                                        }
                                        setIsStreaming(false);
                                        inFlightRef.current = false;
                                    }
                                    break;
                                }

                                case 'ANSWER_ERROR': {
                                    flushDrip();
                                    const errMsg = payload.error ?? 'An unknown error occurred.';
                                    if (currentAssistantIdRef.current) {
                                        setMessages(prev =>
                                            prev.map(m =>
                                                m.id === currentAssistantIdRef.current
                                                    ? { ...m, content: `⚠️ ${errMsg}`, isStreaming: false }
                                                    : m
                                            )
                                        );
                                    }
                                    setError(errMsg);
                                    setIsStreaming(false);
                                    inFlightRef.current = false;
                                    break;
                                }

                                default:
                                    console.warn('[QA WS] Unknown message type:', payload.type);
                            }
                        } catch (e) {
                            console.error('[QA WS] Failed to parse message:', e);
                        }
                    }
                );
            },

            onStompError: frame => {
                console.error('[QA WS] STOMP error:', frame.headers?.message);
                setError(`WebSocket error: ${frame.headers?.message || 'Unknown'}`);
                setIsConnected(false);
            },
            onDisconnect: () => setIsConnected(false),
            onWebSocketClose: () => setIsConnected(false),
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            client.deactivate();
            stompClientRef.current = null;
            setIsConnected(false);
        };
    }, [lectureId, backendUrl, startDrip, flushDrip]);

    // ── 2. Trigger streaming via REST (mirrors useSummaryStream.triggerStream) ─

    const askQuestion = useCallback(async (question: string) => {
        if (!lectureId || !authToken || inFlightRef.current) return;

        inFlightRef.current = true;
        setError(null);

        // Add user message immediately (no drip needed for user messages)
        setMessages(prev => [...prev, {
            id: `u-${Date.now()}`,
            role: 'user',
            content: question,
            timestamp: new Date(),
        }]);

        // Add empty assistant placeholder — the drip feed fills it in
        const assistantMsgId = `a-${Date.now()}`;
        currentAssistantIdRef.current = assistantMsgId;
        wordQueueRef.current = [];
        pendingCompleteRef.current = null;

        setMessages(prev => [...prev, {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
        }]);

        setIsStreaming(true);

        try {
            // POST to /ask-stream — returns 202 ACCEPTED immediately.
            // Tokens arrive via WebSocket, exactly like summarize-stream.
            const res = await fetch(`${backendUrl}/api/lecture/${lectureId}/ask-stream`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            // 202 ACCEPTED — tokens arrive via WebSocket
        } catch (err: any) {
            const msg = err.message || 'Failed to send question.';
            setMessages(prev =>
                prev.map(m =>
                    m.id === assistantMsgId
                        ? { ...m, content: `⚠️ ${msg}`, isStreaming: false }
                        : m
                )
            );
            setIsStreaming(false);
            inFlightRef.current = false;
        }
    }, [lectureId, authToken, backendUrl]);

    // ── 3. Clear conversation ─────────────────────────────────────────────────

    const clearMessages = useCallback(() => {
        flushDrip();
        wordQueueRef.current = [];
        pendingCompleteRef.current = null;
        currentAssistantIdRef.current = null;
        inFlightRef.current = false;
        setMessages([]);
        setIsStreaming(false);
        setError(null);
    }, [flushDrip]);

    // ── 4. Stop streaming ─────────────────────────────────────────────────────
    
    const stopStream = useCallback(() => {
        flushDrip();
        wordQueueRef.current = [];
        pendingCompleteRef.current = null;
        
        // Disconnecting currentAssistantIdRef ensures any late-arriving chunks from the server
        // are ignored in the pipeline
        currentAssistantIdRef.current = null;
        
        inFlightRef.current = false;
        setIsStreaming(false);
    }, [flushDrip]);

    return { messages, isStreaming, isConnected, error, askQuestion, clearMessages, stopStream };
}