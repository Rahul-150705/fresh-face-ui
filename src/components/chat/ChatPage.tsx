import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSummaryStream } from '../../hooks/useSummaryStream';
import { useChatStream } from '../../hooks/useChatStream';
import {
  askQuestion, processLectureByMode, getLectureHistory, getLecture,
  type LectureHistoryItem,
} from '../../services/api';
import type { ChatMessage } from './ChatMessageBubble';
import ChatSidebar, { type Conversation } from './ChatSidebar';
import ChatMessages from './ChatMessages';
import ChatInputBar from './ChatInputBar';
import ChatEmptyState from './ChatEmptyState';

let msgCounter = 0;
const nextId = () => `msg-${++msgCounter}-${Date.now()}`;

export default function ChatPage() {
  const { user, accessToken } = useAuth();

  // Sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  // Messages for current conversation
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);

  // Current lecture context (for PDF conversations)
  const [currentLectureId, setCurrentLectureId] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState('');

  // Streaming hooks
  const summaryStream = useSummaryStream(currentLectureId, accessToken);
  const chatStream = useChatStream();

  // Track current streaming AI message
  const aiMsgIdRef = useRef<string | null>(null);
  const chatAiMsgIdRef = useRef<string | null>(null);
  const hasAutoTriggeredRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentConvIdRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => { currentConvIdRef.current = activeConvId; }, [activeConvId]);

  // Load lecture history as initial conversations
  useEffect(() => {
    if (!accessToken) return;
    getLectureHistory(accessToken).then(items => {
      const convs: Conversation[] = items.map(item => ({
        id: `lecture-${item.id}`,
        title: item.fileName,
        lectureId: item.id,
        type: 'lecture' as const,
        createdAt: new Date(item.processedAt),
      }));
      setConversations(prev => {
        // Merge: keep chat convos, replace lecture convos
        const chatConvs = prev.filter(c => c.type === 'chat');
        return [...chatConvs, ...convs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      });
    }).catch(() => { });
  }, [accessToken]);

  // ── Auto-trigger summary stream when lecture is ready ──
  useEffect(() => { hasAutoTriggeredRef.current = false; }, [currentLectureId]);

  useEffect(() => {
    if (currentLectureId && summaryStream.isConnected && !hasAutoTriggeredRef.current && aiMsgIdRef.current) {
      hasAutoTriggeredRef.current = true;
      summaryStream.triggerStream();
    }
  }, [currentLectureId, summaryStream.isConnected, summaryStream.triggerStream]);

  // ── Update AI message with summary stream ──
  useEffect(() => {
    if (!aiMsgIdRef.current) return;
    setMessages(prev =>
      prev.map(m =>
        m.id === aiMsgIdRef.current
          ? { ...m, content: summaryStream.summary, isStreaming: summaryStream.isStreaming }
          : m
      )
    );
  }, [summaryStream.summary, summaryStream.isStreaming]);

  // Handle summary completion
  useEffect(() => {
    if (summaryStream.isComplete && aiMsgIdRef.current) {
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgIdRef.current
            ? { ...m, isStreaming: false }
            : m
        )
      );
    }
  }, [summaryStream.isComplete]);

  // Handle summary error
  useEffect(() => {
    if (summaryStream.error && aiMsgIdRef.current) {
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgIdRef.current
            ? { ...m, content: summaryStream.error!, type: 'error' as const, isStreaming: false }
            : m
        )
      );
    }
  }, [summaryStream.error]);

  // ── Update AI message with chat stream ──
  useEffect(() => {
    if (!chatAiMsgIdRef.current) return;
    setMessages(prev =>
      prev.map(m =>
        m.id === chatAiMsgIdRef.current
          ? { ...m, content: chatStream.response, isStreaming: chatStream.isStreaming }
          : m
      )
    );
  }, [chatStream.response, chatStream.isStreaming]);

  useEffect(() => {
    if (chatStream.isComplete && chatAiMsgIdRef.current) {
      chatAiMsgIdRef.current = null;
    }
  }, [chatStream.isComplete]);

  useEffect(() => {
    if (chatStream.error && chatAiMsgIdRef.current) {
      setMessages(prev =>
        prev.map(m =>
          m.id === chatAiMsgIdRef.current
            ? { ...m, content: chatStream.error!, type: 'error' as const, isStreaming: false }
            : m
        )
      );
      chatAiMsgIdRef.current = null;
    }
  }, [chatStream.error]);

  // ── New Chat ──
  const handleNewChat = useCallback(() => {
    setActiveConvId(null);
    setMessages([]);
    setCurrentLectureId(null);
    setCurrentFileName('');
    aiMsgIdRef.current = null;
    chatAiMsgIdRef.current = null;
    chatStream.reset();
  }, [chatStream]);

  // ── Select Conversation ──
  const handleSelectConversation = useCallback(async (conv: Conversation) => {
    setActiveConvId(conv.id);
    if (conv.lectureId && accessToken) {
      // Load lecture summary directly into chat messages
      try {
        const lecture = await getLecture(conv.lectureId, accessToken);
        setCurrentLectureId(conv.lectureId);
        setCurrentFileName(lecture.fileName || conv.title);

        // Build chat messages from the lecture data
        const chatMsgs: ChatMessage[] = [];

        // User upload message
        chatMsgs.push({
          id: nextId(),
          role: 'user',
          type: 'file_upload',
          content: '',
          fileName: lecture.fileName || conv.title,
          fileSize: 0,
          pageCount: lecture.pageCount,
          timestamp: new Date(lecture.processedAt || Date.now()),
        });

        // AI summary message
        const summaryText = lecture.summary
          ? (typeof lecture.summary === 'string'
            ? lecture.summary
            : JSON.stringify(lecture.summary, null, 2))
          : 'Summary not available for this lecture.';

        chatMsgs.push({
          id: nextId(),
          role: 'assistant',
          type: 'summary_stream',
          content: summaryText,
          isStreaming: false,
          timestamp: new Date(lecture.processedAt || Date.now()),
        });

        setMessages(chatMsgs);
      } catch {
        // If fetch fails, show error in chat
        setMessages([{
          id: nextId(),
          role: 'assistant',
          type: 'error',
          content: 'Failed to load lecture summary. Please try again.',
          isStreaming: false,
          timestamp: new Date(),
        }]);
      }
    } else {
      // Load chat conversation messages (stored in state for now)
      setCurrentLectureId(null);
      setCurrentFileName('');
    }
  }, [accessToken]);

  // ── Delete Conversation ──
  const handleDeleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) handleNewChat();
  }, [activeConvId, handleNewChat]);

  // ── Send Text Message ──
  const handleSendMessage = useCallback(async (text: string) => {
    if (!accessToken || isAnswering) return;

    const userMsg: ChatMessage = {
      id: nextId(), role: 'user', type: 'text', content: text, timestamp: new Date(),
    };

    const aiId = nextId();
    const aiMsg: ChatMessage = {
      id: aiId, role: 'assistant', type: 'text', content: '', isStreaming: true, timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);

    // Create or update conversation
    if (!activeConvId) {
      const convId = `chat-${Date.now()}`;
      const conv: Conversation = {
        id: convId,
        title: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
        type: 'chat',
        createdAt: new Date(),
      };
      setConversations(prev => [conv, ...prev]);
      setActiveConvId(convId);
    }

    if (currentLectureId) {
      // Follow-up RAG Q&A
      setIsAnswering(true);
      try {
        const res = await askQuestion(currentLectureId, text, accessToken);
        setMessages(prev =>
          prev.map(m =>
            m.id === aiId
              ? { ...m, content: res.answer, isStreaming: false, sourceChunks: res.sourceChunks, chunksUsed: res.chunksUsed }
              : m
          )
        );
      } catch (err: any) {
        setMessages(prev =>
          prev.map(m =>
            m.id === aiId
              ? { ...m, content: err.message || 'Failed to get answer.', type: 'error' as const, isStreaming: false }
              : m
          )
        );
      } finally {
        setIsAnswering(false);
      }
    } else {
      // General chat — use streaming via WebSocket
      chatAiMsgIdRef.current = aiId;
      const convId = `stream-${Date.now()}`;
      chatStream.startStream(convId, text, accessToken);
    }
  }, [accessToken, isAnswering, activeConvId, currentLectureId, chatStream]);

  // ── File Upload ──
  const handleFileSelect = useCallback(async (file: File) => {
    if (!accessToken) return;

    const userMsg: ChatMessage = {
      id: nextId(), role: 'user', type: 'file_upload', content: '',
      fileName: file.name, fileSize: file.size, timestamp: new Date(),
    };

    const aiId = nextId();
    aiMsgIdRef.current = aiId;

    const aiMsg: ChatMessage = {
      id: aiId, role: 'assistant', type: 'summary_stream', content: '',
      isStreaming: true, timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);

    // Create conversation
    const convId = `lecture-upload-${Date.now()}`;
    const conv: Conversation = {
      id: convId,
      title: file.name,
      type: 'lecture',
      createdAt: new Date(),
    };
    setConversations(prev => [conv, ...prev]);
    setActiveConvId(convId);

    try {
      const data = await processLectureByMode(file, 'chat', accessToken);
      setCurrentLectureId(data.lectureId);
      setCurrentFileName(data.fileName || file.name);

      // Update conversation with lectureId
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, lectureId: data.lectureId } : c)
      );

      // Update user message with page info
      setMessages(prev =>
        prev.map(m =>
          m.id === userMsg.id
            ? { ...m, pageCount: data.pageCount }
            : m
        )
      );
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === aiId
            ? { ...m, content: err.message || 'Upload failed.', type: 'error' as const, isStreaming: false }
            : m
        )
      );
      aiMsgIdRef.current = null;
    }
  }, [accessToken]);

  // ── Stop Generation ──
  const handleStop = useCallback(() => {
    if (chatAiMsgIdRef.current && chatStream.isStreaming) {
      // For general chat, try stop endpoint
      const convId = `stream-${Date.now()}`;
      if (accessToken) chatStream.stopStream(convId, accessToken);
    }
    // For summary stream we can't stop it (no backend support yet)
  }, [chatStream, accessToken]);

  const isCurrentlyStreaming = summaryStream.isStreaming || chatStream.isStreaming;
  const currentStreamContent = summaryStream.isStreaming ? summaryStream.summary : chatStream.response;

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />

      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConvId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(v => !v)}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile toggle + model badge) */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-border/50 shrink-0 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {sidebarCollapsed && (
              <button onClick={() => setSidebarCollapsed(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors lg:hidden">
                <Menu className="w-4 h-4" />
              </button>
            )}
            <span className="text-sm font-semibold text-foreground">
              {currentFileName || 'New Chat'}
            </span>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground px-2.5 py-1 rounded-full bg-muted">
            llama3.2
          </span>
        </div>

        {/* Messages or empty state */}
        {messages.length === 0 ? (
          <ChatEmptyState
            onUploadClick={() => fileInputRef.current?.click()}
            userName={user?.fullName}
          />
        ) : (
          <ChatMessages
            messages={messages}
            isStreaming={isCurrentlyStreaming}
            isAnswering={isAnswering}
            streamingContent={currentStreamContent}
          />
        )}

        {/* Input bar */}
        <ChatInputBar
          onSendMessage={handleSendMessage}
          onFileSelect={handleFileSelect}
          onStop={handleStop}
          disabled={false}
          isStreaming={isCurrentlyStreaming}
          isAnswering={isAnswering}
          hasLecture={!!currentLectureId && (summaryStream.isComplete || !!summaryStream.summary)}
        />
      </div>
    </div>
  );
}
