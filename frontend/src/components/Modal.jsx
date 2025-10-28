import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform rounded-lg bg-navy-900 border border-navy-800 shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-navy-800 px-6 py-4">
            <h3 className="text-lg font-semibold text-sky-400">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-sky-400 hover:text-sky-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}