import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/client';

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

const shiftsSlice = createSlice({
  name: 'shifts',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {},
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
        state.list.push(action.payload);
        state.list.sort((a, b) => new Date(a.date + 'T' + a.startTime) - new Date(b.date + 'T' + b.startTime));
      });
  },
});

export default shiftsSlice.reducer;