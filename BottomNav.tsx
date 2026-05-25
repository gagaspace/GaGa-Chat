import { Home, MessageCircle, Phone, Users, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'chats' | 'contacts' | 'timeline' | 'calls' | 'more';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  unreadCount?: number;
}

const tabs = [
  { id: 'contacts' as Tab, label: 'Home', icon: Home },
  { id: 'chats' as Tab, label: 'Chats', icon: MessageCircle },
  { id: 'calls' as Tab, label: 'Calls', icon: Phone },
  { id: 'timeline' as Tab, label: 'Timeline', icon: Users },
  { id: 'more' as Tab, label: 'More', icon: MoreHorizontal },
];

const BottomNav = ({ activeTab, onTabChange, unreadCount = 0 }: BottomNavProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-black border-t border-white/10">
      <div className="flex items-stretch">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2.5 px-1 gap-1 relative transition-all duration-200 min-h-[56px]',
                isActive ? 'text-cyan-300' : 'text-white/40 hover:text-white/60'
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-sky-300"
                />
              )}
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 2}
                  fill={isActive && (id === 'chats' || id === 'contacts') ? 'currentColor' : 'none'}
                  className={isActive ? '[filter:drop-shadow(0_0_6px_rgba(34,211,238,0.5))]' : ''}
                />
                {id === 'chats' && unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[10px] transition-all duration-200',
                isActive ? 'font-bold text-cyan-300' : 'text-white/40'
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-safe-area-inset-bottom bg-black" />
    </div>
  );
};

export default BottomNav;
