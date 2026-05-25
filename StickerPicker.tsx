import { useState } from 'react';
import { X, Clock, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_STICKER_PACKS } from '@/constants/mockData';

interface StickerPickerProps {
  onSelect: (sticker: string) => void;
  onClose: () => void;
}

const RECENT_STICKERS = ['😂', '❤️', '👍', '😍', '🎉', '😊', '🙏', '🔥'];
const EMOJI_SECTION = ['😀', '😂', '🥰', '😍', '😎', '😭', '😱', '🤔', '🙄', '😴', '🥳', '🤩', '😇', '🤗', '😏', '🥺'];

const StickerPicker = ({ onSelect, onClose }: StickerPickerProps) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'emoji' | string>('recent');

  const activePack = activeTab !== 'recent' && activeTab !== 'emoji'
    ? MOCK_STICKER_PACKS.find(p => p.id === activeTab)
    : null;

  const stickersToShow =
    activeTab === 'recent' ? RECENT_STICKERS
      : activeTab === 'emoji' ? EMOJI_SECTION
        : activePack?.stickers.map(s => s.emoji) || [];

  return (
    <div className="bg-[#1a1a1a] border-t border-white/10 animate-slide-in">
      {/* Pack tabs */}
      <div className="flex items-center border-b border-white/10 px-2 pt-2 gap-1 overflow-x-auto scrollbar-hide">
        {/* Recent */}
        <button
          onClick={() => setActiveTab('recent')}
          aria-label="Recent stickers"
          title="Recent stickers"
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-t-lg flex-shrink-0 transition-all',
            activeTab === 'recent' ? 'bg-white/15 border-b-2 border-cyan-300' : 'opacity-50 hover:opacity-75'
          )}
        >
          <Clock size={18} className="text-white" />
        </button>

        {/* Emoji */}
        <button
          onClick={() => setActiveTab('emoji')}
          aria-label="Emoji"
          title="Emoji"
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-t-lg text-xl flex-shrink-0 transition-all',
            activeTab === 'emoji' ? 'bg-white/15 border-b-2 border-cyan-300' : 'opacity-50 hover:opacity-75'
          )}
        >
          😀
        </button>

        {/* Packs */}
        {MOCK_STICKER_PACKS.map(pack => (
          <button
            key={pack.id}
            onClick={() => setActiveTab(pack.id)}
            aria-label={`Open sticker pack ${pack.name}`}
            title={pack.name}
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-t-lg text-xl flex-shrink-0 transition-all',
              activeTab === pack.id ? 'bg-white/15 border-b-2 border-cyan-300' : 'opacity-50 hover:opacity-75'
            )}
          >
            {pack.previewUrl}
          </button>
        ))}

        <button onClick={onClose} className="ml-auto p-2 text-white/40 hover:text-white/70 transition-colors flex-shrink-0" aria-label="Close stickers" title="Close">
          <X size={18} />
        </button>
      </div>

      {/* Tab label */}
      <div className="px-3 py-1.5">
        <p className="text-[10px] text-white/30 uppercase tracking-wide font-medium">
          {activeTab === 'recent' ? 'Recently Used'
            : activeTab === 'emoji' ? 'Emoji'
              : activePack?.name || ''}
        </p>
      </div>

      {/* Stickers grid */}
      <div className="grid grid-cols-5 gap-1 px-2 pb-3 h-36 overflow-y-auto scrollbar-hide">
        {stickersToShow.map((sticker, i) => (
          <button
            key={`${sticker}-${i}`}
            onClick={() => onSelect(sticker)}
            aria-label={`Select sticker ${sticker}`}
            title={`Select sticker ${sticker}`}
            className="text-4xl flex items-center justify-center aspect-square hover:bg-white/10 rounded-xl transition-all hover:scale-110 active:scale-95"
          >
            {sticker}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StickerPicker;
