import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, MessageSquare, FileText, Trash2, LogOut,
  PanelLeftClose, PanelLeft, Bot
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
  onSelectConversation: (c: Conversation) => void;
  onDeleteConversation: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export default function ChatSidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  collapsed,
  onToggle
}: ChatSidebarProps) {
  const { logout } = useAuth();
  const [hoverDeleteId, setHoverDeleteId] = useState<string | null>(null);

  // Group by date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const isRecent = (date: Date) => {
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 1 && diffDays <= 7;
  };

  const groups = [
    { title: 'Today', filter: (c: Conversation) => isSameDay(new Date(c.createdAt), today) },
    { title: 'Yesterday', filter: (c: Conversation) => isSameDay(new Date(c.createdAt), yesterday) },
    { title: 'Previous 7 Days', filter: (c: Conversation) => isRecent(new Date(c.createdAt)) },
    { title: 'Older', filter: (c: Conversation) => {
        const d = new Date(c.createdAt);
        return !isSameDay(d, today) && !isSameDay(d, yesterday) && !isRecent(d);
      }
    }
  ];

  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 0 : 280 }}
      className={`h-full shrink-0 flex flex-col bg-[#1e1f20] overflow-hidden ${collapsed ? 'border-none' : 'border-r border-[#333537]'}`}
    >
      <div className="p-4 flex items-center justify-between shrink-0 h-14">
        {!collapsed && (
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-[#131314] border border-[#333537] flex items-center justify-center">
               <Bot className="w-4 h-4 text-[#a8c7fa]" />
             </div>
             <span className="font-semibold text-[15px] text-[#e3e3e3] tracking-wide">Learn<span className="font-light opacity-70">AI</span></span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-[#c4c7c5] hover:text-[#e3e3e3] hover:bg-[#333537] transition-all ml-auto"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      <div className="px-3 pb-3 shrink-0 mt-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#e3e3e3] hover:bg-white text-[#131314] transition-all font-medium text-[14px]"
        >
          <Plus className="w-5 h-5" />
          <span>New chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-6">
        {groups.map(group => {
          const groupConvs = conversations.filter(group.filter);
          if (groupConvs.length === 0) return null;

          return (
            <div key={group.title}>
              <h3 className="px-3 text-[11px] font-semibold text-[#8e918f] uppercase tracking-wider mb-2">
                {group.title}
              </h3>
              <div className="space-y-0.5">
                {groupConvs.map(conv => {
                  const isActive = activeConversationId === conv.id;
                  return (
                    <div
                      key={conv.id}
                      onMouseEnter={() => setHoverDeleteId(conv.id)}
                      onMouseLeave={() => setHoverDeleteId(null)}
                      className="group relative"
                    >
                      <button
                        onClick={() => onSelectConversation(conv)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                          isActive
                            ? 'bg-[#a8c7fa]/10 text-[#a8c7fa]'
                            : 'text-[#e3e3e3] hover:bg-[#333537]'
                        }`}
                      >
                        {conv.type === 'chat' ? (
                          <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                        ) : (
                          <FileText className="w-4 h-4 shrink-0 opacity-70" />
                        )}
                        <span className="text-[13px] font-medium truncate pr-6">{conv.title}</span>
                      </button>

                      <AnimatePresence>
                        {(isActive || hoverDeleteId === conv.id) && (
                          <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteConversation(conv.id);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[#c4c7c5] hover:text-[#ff8f8f] hover:bg-red-500/10 transition-colors"
                            title="Delete conversation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 shrink-0 border-t border-[#333537] mt-auto">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#c4c7c5] hover:text-[#e3e3e3] hover:bg-[#333537] transition-all text-sm font-medium"
        >
          <LogOut className="w-4 h-4 opacity-70" />
          <span>Sign out</span>
        </button>
      </div>
    </motion.div>
  );
}
