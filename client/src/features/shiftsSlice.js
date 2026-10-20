import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { io } from 'socket.io-client';
import apiClient from '../api/client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});

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

export const fetchUsers = createAsyncThunk('shifts/fetchUsers', async (_, { rejectWithValue }) => {
  try {
    const res = await apiClient.get('/auth/users');
    return res.data.users;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to fetch users');
  }
});

const shiftsSlice = createSlice({
  name: 'shifts',
  initialState: {
    list: [],
    users: [],
    loading: false,
    error: null,
  },
  reducers: {
    shiftReceivedViaSocket: (state, action) => {
      const exists = state.list.some((s) => s._id === action.payload._id);
      if (!exists) {
        state.list.push(action.payload);
        state.list.sort((a, b) => new Date(a.date + 'T' + a.startTime) - new Date(b.date + 'T' + b.startTime));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchShifts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchShifts.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchShifts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createShift.fulfilled, (state, action) => {
        const exists = state.list.some((s) => s._id === action.payload._id);
        if (!exists) {
          state.list.push(action.payload);
          state.list.sort((a, b) => new Date(a.date + 'T' + a.startTime) - new Date(b.date + 'T' + b.startTime));
        }
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users = action.payload;
      });
  },
});

export const { shiftReceivedViaSocket } = shiftsSlice.actions;
export default shiftsSlice.reducer;

export const socketMiddleware = (store) => (next) => (action) => {
  if (!socket.connected) {
    socket.connect();
  }

  return next(action);
};

socket.on('shift:created', (shift) => {
  console.log('[socket] received new shift:', shift);
});