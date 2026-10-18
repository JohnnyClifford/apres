import { configureStore } from '@reduxjs/toolkit';
import shiftsReducer from '../features/shiftsSlice';

export const store = configureStore({
  reducer: {
    shifts: shiftsReducer,
  },
});