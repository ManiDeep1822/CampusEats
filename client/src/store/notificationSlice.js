import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// Async Thunks
export const fetchNotifications = createAsyncThunk('notification/fetch', async () => {
  const { data } = await api.get('/notifications');
  return data;
});

export const markNotificationRead = createAsyncThunk('notification/markRead', async (id) => {
  await api.put(`/notifications/${id}/read`);
  return id;
});

export const markAllNotificationsRead = createAsyncThunk('notification/markAllRead', async () => {
  await api.put('/notifications/mark-all-read');
});

export const deleteNotifications = createAsyncThunk('notification/clear', async () => {
  await api.delete('/notifications');
});

const initialState = {
  items: [],
  unreadCount: 0,
  loading: false
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      // For real-time socket events
      state.items.unshift({
        _id: action.payload._id || Date.now().toString(),
        message: action.payload.message,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      state.unreadCount += 1;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = action.payload;
        state.unreadCount = action.payload.filter(n => !n.isRead).length;
        state.loading = false;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const notif = state.items.find(n => n._id === action.payload);
        if (notif && !notif.isRead) {
          notif.isRead = true;
          state.unreadCount -= 1;
        }
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items.forEach(n => n.isRead = true);
        state.unreadCount = 0;
      })
      .addCase(deleteNotifications.fulfilled, (state) => {
        state.items = [];
        state.unreadCount = 0;
      });
  }
});

export const { addNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
