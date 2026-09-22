import { configureStore } from '@reduxjs/toolkit';
import sidebarReducer from './slices/sidebarSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      sidebar: sidebarReducer,
    },
  });
};

// Type definitions inferred from the store factory
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];