import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import { router } from './app/router';

export function App() {
  return (
    <ThemeProvider>
      <div className="veil" aria-hidden />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
