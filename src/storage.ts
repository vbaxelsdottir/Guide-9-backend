import { movies, type Movie } from './movies';

export function storageKey(year: number): string {
  return `christmas-movie-calendar:${year}:opened`;
}

export function readOpenedDays(year: number): number[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey(year)) ?? '[]');
    return Array.isArray(value)
      ? [...new Set(value.filter((day): day is number => Number.isInteger(day) && day >= 1 && day <= 24))]
      : [];
  } catch {
    return []; // Corrupt or unavailable storage should not break the calendar.
  }
}

export function moviesKey(year: number): string {
  return `christmas-movie-calendar:${year}:movies`;
}

export function readMovies(year: number): Movie[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(moviesKey(year)) ?? 'null');
    if (!Array.isArray(saved) || saved.length !== 24) return movies;
    return movies.map(original => {
      const entry = saved.find(item => item && item.day === original.day);
      return entry && typeof entry.title === 'string' && entry.title.trim()
        ? { day: original.day, title: entry.title.trim().slice(0, 120) }
        : original;
    });
  } catch {
    return movies;
  }
}
