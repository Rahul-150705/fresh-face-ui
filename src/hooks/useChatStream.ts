import { useState, useEffect, useRef, useCallback } from 'react';
import SockJS from 'sockjs-client';
import { Client, type IMessage } from '@stomp/stompjs';
import { BASE_URL } from '../config';

interface ChatStreamPayload {
  type: 'CHAT_CHUNK' | 'CHAT_COMPLETED' | 'CHAT_ERROR';
  conversationId: string;
  chunk?: string;
  fullResponse?: string;
  error?: string;
}

export interface UseChatStreamReturn {
  response: string;
  isStreaming: boolean;
  isComplete: boolean;
  isConnected: boolean;
  error: string | null;
  startStream: (conversationId: string, message: string, token: string) => Promise<void>;
  stopStream: (conversationId: string, token: string) => Promise<void>;
  reset: () => void;
}

export function useChatStream(backendUrl = BASE_URL): UseChatStreamReturn {
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const stompClientRef = useRef<Client | null>(null);
  const responseRef = useRef('');

  // Connect STOMP when conversationId is set
  useEffect(() => {
    if (!conversationId) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${backendUrl}/ws/lectures`),
      reconnectDelay: 5000,
      onConnect: () => {
        setIsConnected(true);
        client.subscribe(`/topic/chat/${conversationId}`, (message: IMessage) => {
          try {
            const payload: ChatStreamPayload = JSON.parse(message.body);
            switch (payload.type) {
              case 'CHAT_CHUNK':
                responseRef.current += payload.chunk ?? '';
                setResponse(responseRef.current);
                setIsStreaming(true);
                break;
              case 'CHAT_COMPLETED':
                if (payload.fullResponse) {
                  responseRef.current = payload.fullResponse;
                  setResponse(payload.fullResponse);
                }
                setIsStreaming(false);
                setIsComplete(true);
                break;
              case 'CHAT_ERROR':
                setError(payload.error ?? 'An error occurred.');
                setIsStreaming(false);
                break;
            }
          } catch (e) {
            console.error('[ChatWS] Failed to parse:', e);
          }
        });
      },
      onStompError: (frame) => {
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
  }, [conversationId, backendUrl]);

  const startStream = useCallback(async (convId: string, message: string, token: string) => {
    responseRef.current = '';
    setResponse('');
    setIsStreaming(false);
    setIsComplete(false);
    setError(null);
    setConversationId(convId);

    // Wait a beat for STOMP connection
    await new Promise(r => setTimeout(r, 500));

    try {
      const res = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversationId: convId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setIsStreaming(true);
    } catch (err: any) {
      setError(err.message || 'Failed to start chat.');
    }
  }, [backendUrl]);

  const stopStream = useCallback(async (convId: string, token: string) => {
    try {
      await fetch(`${backendUrl}/api/chat/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId }),
      });
      setIsStreaming(false);
      setIsComplete(true);
    } catch {
      // ignore
    }
  }, [backendUrl]);

  const reset = useCallback(() => {
    responseRef.current = '';
    setResponse('');
    setIsStreaming(false);
    setIsComplete(false);
    setError(null);
    setConversationId(null);
    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
      stompClientRef.current = null;
    }
  }, []);

  return { response, isStreaming, isComplete, isConnected, error, startStream, stopStream, reset };
}
