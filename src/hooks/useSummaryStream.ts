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

    // Reset the trigger guard when lectureId changes (new lecture = fresh start)
    useEffect(() => {
        triggerInFlightRef.current = false;
    }, [lectureId]);

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
                                case 'SUMMARY_CHUNK':
                                    // Append each token — this creates the live typing effect
                                    setSummary(prev => prev + (payload.chunk ?? ''));
                                    setIsStreaming(true);
                                    break;

                                case 'SUMMARY_COMPLETED':
                                    // Replace with the authoritative full text from the server
                                    if (payload.fullSummary) {
                                        setSummary(payload.fullSummary);
                                    }
                                    setIsStreaming(false);
                                    setIsComplete(true);
                                    break;

                                case 'SUMMARY_ERROR':
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
    }, [lectureId, backendUrl]);

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
    }, [lectureId, authToken, backendUrl]);


    // ── 3. Page refresh recovery — load saved summary from REST ─────────────

    useEffect(() => {
        if (!lectureId || !authToken) return;

        (async () => {
            try {
                const res = await fetch(`${backendUrl}/api/lecture/${lectureId}`, {
                    headers: { Authorization: `Bearer ${authToken}` },
                });
                if (!res.ok) return;

                const lecture = await res.json();
                if (lecture.summary && typeof lecture.summary === 'string' && lecture.summary.trim()) {
                    setSummary(lecture.summary);
                    setIsComplete(true);
                }
            } catch {
                // Non-fatal — user can still trigger a fresh stream
            }
        })();
    }, [lectureId, authToken, backendUrl]);

    return { summary, isStreaming, isComplete, isConnected, error, triggerStream };
}
