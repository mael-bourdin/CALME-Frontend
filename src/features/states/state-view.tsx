import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Info, X } from 'lucide-react';
import { findState } from './catalogue';

/**
 * Un état, plein écran, avec sa note repliable.
 *
 * La note explique pourquoi l'écran est comme ça — elle sert au jury, pas à
 * l'occupante de la cabine, donc elle se referme.
 */
export function StateView() {
  const { stateId = '' } = useParams();
  const entry = findState(stateId);
  const [noteOpen, setNoteOpen] = useState(false);

  if (!entry) return <Navigate to="/ecrans" replace />;

  return (
    <div className="relative">
      {entry.render()}

      <div className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-1.5">
        <Link
          to="/ecrans"
          className="glass-thick glass-edge inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.7} aria-hidden />
          {entry.title}
        </Link>

        <button
          type="button"
          onClick={() => setNoteOpen((open) => !open)}
          aria-expanded={noteOpen}
          aria-label="Pourquoi cet écran"
          className="glass-thick glass-edge grid size-9 place-items-center rounded-full text-ink-soft transition-colors hover:text-ink"
        >
          {noteOpen ? (
            <X className="size-4" strokeWidth={1.7} aria-hidden />
          ) : (
            <Info className="size-4" strokeWidth={1.7} aria-hidden />
          )}
        </button>
      </div>

      <AnimatePresence>
        {noteOpen && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="glass-thick glass-edge fixed left-1/2 top-16 z-50 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 rounded-card px-5 py-4 text-sm text-ink-soft"
          >
            {entry.note}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
