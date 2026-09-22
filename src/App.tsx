import { ThemeProvider } from './lib/theme';

export function App() {
  return (
    <ThemeProvider>
      <div className="veil" aria-hidden />
      <main className="grid min-h-dvh place-items-center px-6">
        <div className="glass glass-edge rounded-[var(--radius-panel)] px-10 py-9 text-center">
          <p className="font-display text-5xl tracking-tight">C.A.L.M.E.</p>
          <p className="mt-2 text-sm text-ink-soft">Socle en place.</p>
        </div>
      </main>
    </ThemeProvider>
  );
}
