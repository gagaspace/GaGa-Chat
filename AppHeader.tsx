import { Search, Plus, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoSrc from '@/assets/logo.jpg';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  onSearch?: () => void;
  onAdd?: () => void;
  rightActions?: React.ReactNode;
  subtitle?: string;
  avatar?: string;
  isOnline?: boolean;
  transparent?: boolean;
  showLogo?: boolean;
}

const AppHeader = ({
  title,
  showBack,
  onBack,
  onSearch,
  onAdd,
  rightActions,
  subtitle,
  avatar,
  isOnline,
  transparent,
  showLogo,
}: AppHeaderProps) => {
  return (
    <div className={cn(
      'sticky top-0 z-40 flex items-center gap-3 px-4 py-3',
      transparent ? 'bg-transparent' : 'gchat-header',
    )}>
      {showBack && (
        <button
          onClick={onBack}
          className="p-1 -ml-1 text-white/80 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Back"
          title="Back"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {showLogo && !showBack && (
        <img
          src={logoSrc}
          alt="GaGa Chat"
          className="w-10 h-10 rounded-full gchat-logo-glow flex-shrink-0"
        />
      )}

      {avatar && (
        <div className="relative flex-shrink-0">
          <img src={avatar} alt={title} className="w-9 h-9 rounded-full object-cover bg-black/10" />
          {isOnline !== undefined && (
            <div className={cn(
              'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
              isOnline ? 'bg-cyan-400' : 'bg-slate-500'
            )} />
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h1 className="text-white font-bold text-base leading-tight truncate drop-shadow-sm">{title}</h1>
        {subtitle && (
          <p className="text-white/60 text-xs truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {onSearch && (
          <button
            onClick={onSearch}
            className="p-2 text-white/70 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Search"
            title="Search"
          >
            <Search size={20} />
          </button>
        )}
        {onAdd && (
          <button
            onClick={onAdd}
            className="p-2 text-white/70 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Add"
            title="Add"
          >
            <Plus size={20} />
          </button>
        )}
        {rightActions}
      </div>
    </div>
  );
};

export default AppHeader;
