import { useState, useEffect, useRef, useCallback } from 'react';
import SockJS from 'sockjs-client';
import { Client, type IMessage } from '@stomp/stompjs';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Message payload shape sent by the Spring Boot WebSocket backend. */
interface SummaryStreamPayload {
    type: 'SUMMARY_CHUNK' | 'SUMMARY_COMPLETED' | 'SUMMARY_ERROR';
    lectureId: string;
    chunk?: string;
    fullSummary?: string;
    error?: string;
}

/** Return value of the useSummaryStream hook. */
export interface UseSummaryStreamReturn {
    /** Accumulated summary text (grows chunk-by-chunk during streaming). */
    summary: string;
    /** True while SUMMARY_CHUNK messages are arriving. */
    isStreaming: boolean;
    /** True after a SUMMARY_COMPLETED message is received. */
    isComplete: boolean;
    /** True when the STOMP WebSocket is connected and subscribed. */
    isConnected: boolean;
    /** Error message if something went wrong, or null. */
    error: string | null;
    /** Call this to trigger the streaming summarization via REST. */
    triggerStream: () => Promise<void>;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * useSummaryStream — manages real-time streaming summarization.
 *
 * 1. Connects to /ws/lectures via SockJS + STOMP
 * 2. Subscribes to /topic/lectures/{lectureId}
 * 3. Accumulates SUMMARY_CHUNK messages into `summary` state
 * 4. Handles SUMMARY_COMPLETED and SUMMARY_ERROR
 * 5. On mount, checks if a saved summary exists (page refresh recovery)
 *
 * @param lectureId  — UUID of the lecture
 * @param authToken  — JWT access token for the REST trigger call
 * @param backendUrl — base URL of the Spring Boot backend (default: '' for Vite proxy)
 */
/** Delay (ms) between each drip tick — 1 word per 40ms ≈ 25 words/sec. */
const DRIP_DELAY_MS = 70;

export function useSummaryStream(
    lectureId: string | null | undefined,
    authToken: string | null,
    backendUrl = ''
): UseSummaryStreamReturn {
    const [summary, setSummary] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const stompClientRef = useRef<Client | null>(null);
    const triggerInFlightRef = useRef(false);

    // ── Drip-feed buffer — ALL chunks flow through this for uniform speed ───
    const wordQueueRef = useRef<string[]>([]);
    const dripTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pendingCompleteRef = useRef<string | null>(null);

    /** Start the drip timer if not already running. */
    const startDrip = useCallback(() => {
        if (dripTimerRef.current) return;
        dripTimerRef.current = setInterval(() => {
            if (wordQueueRef.current.length === 0) {
                clearInterval(dripTimerRef.current!);
                dripTimerRef.current = null;
                // Apply deferred SUMMARY_COMPLETED if it arrived while dripping
                if (pendingCompleteRef.current !== null) {
                    setSummary(pendingCompleteRef.current);
                    pendingCompleteRef.current = null;
                    setIsStreaming(false);
                    setIsComplete(true);
                }
                return;
            }
            // Flush 1 word per tick for a visible, smooth streaming effect
            const word = wordQueueRef.current.shift()!;
            setSummary(prev => prev + word);
        }, DRIP_DELAY_MS);
    }, []);

    /** Stop dripping and flush remaining words instantly. */
    const flushDrip = useCallback(() => {
        if (dripTimerRef.current) {
            clearInterval(dripTimerRef.current);
            dripTimerRef.current = null;
        }
        if (wordQueueRef.current.length > 0) {
            const remaining = wordQueueRef.current.join('');
            wordQueueRef.current = [];
            setSummary(prev => prev + remaining);
        }
    }, []);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (dripTimerRef.current) {
                clearInterval(dripTimerRef.current);
                dripTimerRef.current = null;
            }
        };
    }, []);

    // Reset when lectureId changes
    useEffect(() => {
        triggerInFlightRef.current = false;
        flushDrip();
        wordQueueRef.current = [];
        pendingCompleteRef.current = null;
    }, [lectureId, flushDrip]);

    // ── 1. WebSocket connection + subscription ──────────────────────────────

    useEffect(() => {
        if (!lectureId) return;

        const client = new Client({
            // SockJS transport — auto-fallback to HTTP long-polling if WS is blocked
            webSocketFactory: () => new SockJS(`${backendUrl}/ws/lectures`),
            reconnectDelay: 5000,

            onConnect: () => {
                console.log('[WS] STOMP connected');
                setIsConnected(true);

                client.subscribe(
                    `/topic/lectures/${lectureId}`,
                    (message: IMessage) => {
                        try {
                            const payload: SummaryStreamPayload = JSON.parse(message.body);

                            switch (payload.type) {
                                case 'SUMMARY_CHUNK': {
                                    const chunk = payload.chunk ?? '';
                                    if (!chunk) break;

                                    // Split into word-level tokens preserving whitespace
                                    // e.g. "hello world\n" → ["hello", " ", "world", "\n"]
                                    const tokens = chunk.split(/(\s+)/);
                                    wordQueueRef.current.push(...tokens);
                                    startDrip();

                                    setIsStreaming(true);
                                    break;
                                }

                                case 'SUMMARY_COMPLETED':
                                    // If still dripping words, defer the completion
                                    if (wordQueueRef.current.length > 0 || dripTimerRef.current) {
                                        pendingCompleteRef.current = payload.fullSummary ?? null;
                                    } else {
                                        if (payload.fullSummary) {
                                            setSummary(payload.fullSummary);
                                        }
                                        setIsStreaming(false);
                                        setIsComplete(true);
                                    }
                                    break;

                                case 'SUMMARY_ERROR':
                                    flushDrip();
                                    setError(payload.error ?? 'An unknown error occurred.');
                                    setIsStreaming(false);
                                    break;

                                default:
                                    console.warn('[WS] Unknown message type:', payload.type);
                            }
                        } catch (e) {
                            console.error('[WS] Failed to parse message:', e);
                        }
                    }
                );
            },

            onStompError: (frame) => {
                console.error('[WS] STOMP error:', frame.headers?.message);
                setError(`WebSocket error: ${frame.headers?.message || 'Unknown'}`);
                setIsConnected(false);
            },

            onDisconnect: () => {
                setIsConnected(false);
            },

            onWebSocketClose: () => {
                setIsConnected(false);
            },
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            client.deactivate();
            stompClientRef.current = null;
            setIsConnected(false);
        };
    }, [lectureId, backendUrl, startDrip, flushDrip]);

    // ── 2. Trigger streaming via REST ───────────────────────────────────────

    const triggerStream = useCallback(async () => {
        if (!lectureId || !authToken) {
            setError('Missing lectureId or authentication token.');
            return;
        }

        // Prevent duplicate triggers (auto-trigger + button click)
        if (triggerInFlightRef.current) return;
        triggerInFlightRef.current = true;

        // Reset state for new stream
        flushDrip();
        wordQueueRef.current = [];
        pendingCompleteRef.current = null;
        setSummary('');
        setIsStreaming(false);
        setIsComplete(false);
        setError(null);

        try {
            const res = await fetch(
                `${backendUrl}/api/lecture/${lectureId}/summarize-stream`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${authToken}` },
                }
            );

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            // 202 ACCEPTED — show "AI is thinking…" immediately
            setIsStreaming(true);
        } catch (err: any) {
            setError(err.message || 'Failed to start summarization.');
            triggerInFlightRef.current = false; // allow retry on error
        }
    }, [lectureId, authToken, backendUrl, flushDrip]);




    return { summary, isStreaming, isComplete, isConnected, error, triggerStream };
}
