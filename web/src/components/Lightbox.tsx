import { useEffect } from 'react';
import type { MediaView } from '../../../shared/types';

export function Lightbox({ items, index, onIndex, onClose, onDelete, onCaption }: {
  items: MediaView[]; index: number; onIndex: (i: number) => void; onClose: () => void;
  onDelete?: (m: MediaView) => void; onCaption?: (m: MediaView) => void;
}) {
  const m = items[index];
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < items.length - 1) onIndex(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [index, items.length, onIndex, onClose]);
  if (!m) return null;
  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal>
      <button className="lb-close" onClick={onClose} aria-label="Close">×</button>
      {index > 0 && <button className="lb-nav prev" onClick={(e) => { e.stopPropagation(); onIndex(index - 1); }} aria-label="Previous">‹</button>}
      {index < items.length - 1 && <button className="lb-nav next" onClick={(e) => { e.stopPropagation(); onIndex(index + 1); }} aria-label="Next">›</button>}
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={m.url} alt={m.caption ?? ''} />
        <figcaption>
          <span>{m.caption ?? <i className="muted">No caption</i>}</span>
          <small className="muted">{index + 1} / {items.length}</small>
          {onCaption && <button className="btn ghost" onClick={() => onCaption(m)}>Edit caption</button>}
          {onDelete && <button className="btn danger" onClick={() => onDelete(m)}>Delete photo</button>}
        </figcaption>
      </figure>
    </div>
  );
}
