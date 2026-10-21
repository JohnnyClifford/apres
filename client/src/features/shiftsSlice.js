import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { io } from 'socket.io-client';
import apiClient from '../api/client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
export const socket = io(SOCKET_URL, { autoConnect: false });

export const fetchShifts = createAsyncThunk('shifts/fetchShifts', async (_, { rejectWithValue }) => {
  try {
    const res = await apiClient.get('/shifts');
    return res.data.shifts;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to fetch shifts');
  }
});

export const createShift = createAsyncThunk('shifts/createShift', async (shiftData, { rejectWithValue }) => {
  try {
    const res = await apiClient.post('/shifts', shiftData);
    return res.data.shift;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to create shift');
  }
});

export const deleteShift = createAsyncThunk('shifts/deleteShift', async (id, { rejectWithValue }) => {
  try {
    await apiClient.delete(`/shifts/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to delete shift');
  }
});

export const fetchUsers = createAsyncThunk('shifts/fetchUsers', async (_, { rejectWithValue }) => {
  try {
    const res = await apiClient.get('/auth/users');
    return res.data.users;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to fetch users');
  }
});

export const fetchSwaps = createAsyncThunk('shifts/fetchSwaps', async (_, { rejectWithValue }) => {
  try {
    const res = await apiClient.get('/swaps');
    return res.data.swaps;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to fetch swaps');
  }
});

export function subscribeToSwapEvents(dispatch) {
  const refreshSwaps = () => dispatch(fetchSwaps());
  socket.on('swap:requested', refreshSwaps);
  socket.on('swap:updated', refreshSwaps);

  return () => {
    socket.off('swap:requested', refreshSwaps);
    socket.off('swap:updated', refreshSwaps);
  };
}

const shiftsSlice = createSlice({
  name: 'shifts',
  initialState: { list: [], users: [], swaps: [], loading: false, error: null },
  reducers: {
    shiftReceivedViaSocket: (state, action) => {
      const index = state.list.findIndex((s) => s._id === action.payload._id);
      if (index === -1) {
        state.list.push(action.payload);
      } else {
        state.list[index] = action.payload;
      }
      state.list.sort((a, b) => new Date(a.date + 'T' + a.startTime) - new Date(b.date + 'T' + b.startTime));
    },
    shiftDeletedViaSocket: (state, action) => {
      state.list = state.list.filter(s => s._id !== action.payload);
    },
    swapReceivedViaSocket: (state, action) => {
      const index = state.swaps.findIndex((swap) => swap._id === action.payload._id);
      if (index === -1) {
        state.swaps.unshift(action.payload);
      } else {
        state.swaps[index] = action.payload;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchShifts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchShifts.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchShifts.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createShift.fulfilled, (state, action) => {
        const exists = state.list.some((s) => s._id === action.payload._id);
        if (!exists) {
          state.list.push(action.payload);
          state.list.sort((a, b) => new Date(a.date + 'T' + a.startTime) - new Date(b.date + 'T' + b.startTime));
        }
      })
      .addCase(deleteShift.fulfilled, (state, action) => {
        state.list = state.list.filter(s => s._id !== action.payload);
      })
      .addCase(fetchUsers.fulfilled, (state, action) => { state.users = action.payload; })
      .addCase(fetchSwaps.fulfilled, (state, action) => { state.swaps = action.payload; });
  },
});

export const { shiftReceivedViaSocket, shiftDeletedViaSocket, swapReceivedViaSocket } = shiftsSlice.actions;
export default shiftsSlice.reducer;