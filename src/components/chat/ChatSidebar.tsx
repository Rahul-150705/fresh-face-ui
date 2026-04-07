import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, MessageSquare, FileText, Trash2, LogOut,
  PanelLeftClose, PanelLeft, Search, GraduationCap, Bot
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { checkHealth } from '../../services/api';

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
  const { user, logout } = useAuth();
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

  // Collapsed state
  if (collapsed) {
    return (
      <div className="w-[52px] h-full flex flex-col items-center py-3 gap-2 border-r border-border bg-background shrink-0">
        <button onClick={onToggle}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <PanelLeft className="w-4 h-4" />
        </button>
        <button onClick={onNewChat}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Plus className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button onClick={logout}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 260, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="h-full flex flex-col border-r border-border bg-muted/20 shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--gradient-brand)' }}>
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-foreground tracking-tight">LearnAI</span>
        </div>
        <button onClick={onToggle}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* New chat */}
      <div className="px-3 pb-2 shrink-0">
        <button onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
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
            placeholder="Search…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3">
        {Object.entries(grouped).map(([label, convs]) => (
          <div key={label}>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">{label}</p>
            <div className="space-y-0.5">
              {convs.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  onMouseEnter={() => setHoverDeleteId(conv.id)}
                  onMouseLeave={() => setHoverDeleteId(null)}
                  className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all duration-150 ${
                    activeConversationId === conv.id
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  {conv.type === 'lecture' ? (
                    <FileText className="w-4 h-4 shrink-0" />
                  ) : (
                    <MessageSquare className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate flex-1">{conv.title}</span>
                  {hoverDeleteId === conv.id && (
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
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

      {/* Provider */}
      {provider && (
        <div className="px-3 py-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
            <Bot className="w-3 h-3" />
            {provider.charAt(0).toUpperCase() + provider.slice(1)}
          </span>
        </div>
      )}

      {/* User */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'var(--gradient-brand)' }}>
            {user?.fullName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.fullName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button onClick={logout}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
