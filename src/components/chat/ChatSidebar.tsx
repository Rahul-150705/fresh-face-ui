import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, MessageSquare, FileText, Trash2, LogOut,
  ChevronLeft, Search, GraduationCap, Bot
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLectureHistory, deleteLecture, checkHealth, type LectureHistoryItem } from '../../services/api';

export interface Conversation {
  id: string;
  title: string;
  lectureId?: string;
  type: 'chat' | 'lecture';
  createdAt: Date;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (conv: Conversation) => void;
  onDeleteConversation: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

function formatDate(d: Date) {
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(convs: Conversation[]): Record<string, Conversation[]> {
  const groups: Record<string, Conversation[]> = {};
  for (const c of convs) {
    const label = formatDate(c.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(c);
  }
  return groups;
}

export default function ChatSidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  collapsed,
  onToggle,
}: ChatSidebarProps) {
  const { user, accessToken, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState<string | null>(null);
  const [hoverDeleteId, setHoverDeleteId] = useState<string | null>(null);

  useEffect(() => {
    checkHealth().then(d => setProvider(d.provider)).catch(() => setProvider('ollama'));
  }, []);

  const filtered = search
    ? conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const grouped = groupByDate(filtered);

  if (collapsed) {
    return (
      <div className="w-14 h-full flex flex-col items-center py-4 gap-4 border-r border-border bg-sidebar shrink-0">
        <button onClick={onToggle}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary text-primary-foreground hover:opacity-90 transition-all">
          <GraduationCap className="w-4 h-4" />
        </button>
        <button onClick={onNewChat}
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <Plus className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button onClick={logout}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="h-full flex flex-col border-r border-border bg-sidebar shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-sidebar-foreground">LearnAI</span>
        </div>
        <button onClick={onToggle}
          className="p-1.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* New chat button */}
      <div className="px-3 pb-2 shrink-0">
        <button onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-sidebar-border text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-sidebar-accent text-sm text-sidebar-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring/30"
          />
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3">
        {Object.entries(grouped).map(([label, convs]) => (
          <div key={label}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">{label}</p>
            <div className="space-y-0.5">
              {convs.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  onMouseEnter={() => setHoverDeleteId(conv.id)}
                  onMouseLeave={() => setHoverDeleteId(null)}
                  className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-colors ${
                    activeConversationId === conv.id
                      ? 'bg-sidebar-accent text-sidebar-foreground font-semibold'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50'
                  }`}
                >
                  {conv.type === 'lecture' ? (
                    <FileText className="w-4 h-4 text-foreground shrink-0" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate flex-1">{conv.title}</span>
                  {hoverDeleteId === conv.id && (
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                      className="p-1 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
        )}
      </div>

      {/* Provider badge */}
      {provider && (
        <div className="px-3 py-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-foreground">
            <Bot className="w-3 h-3" />
            {provider.charAt(0).toUpperCase() + provider.slice(1)}
          </span>
        </div>
      )}

      {/* User footer */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary shrink-0">
            {user?.fullName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">{user?.fullName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button onClick={logout}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
