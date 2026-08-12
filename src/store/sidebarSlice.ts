
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SidebarState {
  isOpen: boolean;
}

// isOpen only drives the off-canvas drawer on mobile (<=768px); the sidebar
// is always visible on desktop regardless of this flag. Starts closed so it
// doesn't flash open over the page on a mobile load.
const initialState: SidebarState = {
  isOpen: false,
};

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isOpen = !state.isOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isOpen = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebarOpen } = sidebarSlice.actions;
export default sidebarSlice.reducer;
