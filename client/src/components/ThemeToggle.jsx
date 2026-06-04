import React from 'react';
import { FiMoon, FiSun } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ className }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark theme"
      className={[
        'flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition-colors',
        'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
        'dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 dark:hover:bg-slate-700',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {theme === 'dark' ? (
        <>
          <FiSun className="text-amber-300" />
          <span>Light</span>
        </>
      ) : (
        <>
          <FiMoon className="text-indigo-500" />
          <span>Dark</span>
        </>
      )}
    </button>
  );
};

export default ThemeToggle;
