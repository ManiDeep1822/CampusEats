import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeOrder: null,
  orderHistory: [],
  trackingStatus: null,
};

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    setActiveOrder: (state, action) => {
      state.activeOrder = action.payload;
      state.trackingStatus = action.payload.status;
    },
    updateOrderStatus: (state, action) => {
      const { status } = action.payload;
      state.trackingStatus = status;
      if (state.activeOrder) {
        state.activeOrder.status = status;
      }
    },
    clearActiveOrder: (state) => {
      state.activeOrder = null;
      state.trackingStatus = null;
    }
  },
});

export const { setActiveOrder, updateOrderStatus, clearActiveOrder } = orderSlice.actions;
export default orderSlice.reducer;
