import { AnimatePresence, motion } from 'motion/react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/cn';

/**
 * Le mode sombre n'est pas un thème décoratif : le dossier décrit l'écran de la
 * cabine comme devant rester sombre, parce qu'il fait partie de l'environnement
 * de la séance. Le poste du médecin est consulté en lumière normale.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  const nextLabel = resolved === 'dark' ? 'Passer en clair' : 'Passer en sombre';

  return (
    <button
      type="button"
      onClick={toggle}
      title={nextLabel}
      aria-label={nextLabel}
      className={cn(
        'glass glass-edge grid size-10 place-items-center rounded-full',
        'text-ink-soft transition-colors duration-300 ease-calm hover:text-ink',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={resolved}
          initial={{ opacity: 0, rotate: -35, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 35, scale: 0.7 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="grid place-items-center"
        >
          {resolved === 'dark' ? (
            <Sun className="size-4.5" strokeWidth={1.7} aria-hidden />
          ) : (
            <Moon className="size-4.5" strokeWidth={1.7} aria-hidden />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
