import { createSlice } from '@reduxjs/toolkit';

const userInfo = JSON.parse(localStorage.getItem('userInfo')) || null;

const initialState = {
  user: userInfo?.user || null,
  token: userInfo?.token || null,
  role: userInfo?.role || null,
  isAuthenticated: !!userInfo?.token,
  isSessionTerminated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.role = action.payload.role;
      state.isAuthenticated = true;
      state.isSessionTerminated = false;
      localStorage.setItem('userInfo', JSON.stringify({
        user: state.user,
        token: state.token,
        role: state.role
      }));
    },
    terminateSession: (state) => {
      state.isSessionTerminated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.role = null;
      state.isAuthenticated = false;
      state.isSessionTerminated = false;
      localStorage.removeItem('userInfo');
    },
  },
});

export const { setCredentials, logout, terminateSession } = authSlice.actions;
export default authSlice.reducer;
