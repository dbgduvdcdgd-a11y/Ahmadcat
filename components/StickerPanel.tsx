import React from 'react';
import { stickers } from '../data/stickers';

interface StickerPanelProps {
    onSelectSticker: (url: string) => void;
    onClose: () => void;
}

const StickerPanel: React.FC<StickerPanelProps> = ({ onSelectSticker, onClose }) => {
  return (
    <div className="w-64 h-72 p-2 bg-slate-700 rounded-lg shadow-2xl flex flex-col">
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-4 gap-2">
            {stickers.map((url) => (
                <button 
                    key={url} 
                    onClick={() => onSelectSticker(url)} 
                    className="p-1 rounded-md hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="إرسال ملصق"
                >
                <img src={url} alt="ملصق" className="w-full h-full object-contain" />
                </button>
            ))}
        </div>
      </div>
       <button 
            onClick={onClose} 
            className="mt-2 text-xs text-slate-400 hover:text-white"
        >
            إغلاق
        </button>
    </div>
  );
};

export default StickerPanel;
