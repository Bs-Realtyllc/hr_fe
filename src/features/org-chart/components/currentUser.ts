'use client';
import { createContext, useContext } from 'react';

// The signed-in user's id, passed to every node without rebuilding the
// layout (React Flow nodes only receive their own `data`).
export const CurrentUserIdContext = createContext<number | null>(null);

export const useCurrentUserId = () => useContext(CurrentUserIdContext);
