import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  vendorId: null,
  totalAmount: 0,
  totalItems: 0,
};

const calculateTotals = (state) => {
  state.totalItems = state.items.reduce((acc, item) => acc + item.quantity, 0);
  state.totalAmount = state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload;
      
      if (state.vendorId && state.vendorId !== item.vendorId) {
        state.items = [];
        state.vendorId = item.vendorId;
      } else if (!state.vendorId) {
        state.vendorId = item.vendorId;
      }

      const existingItem = state.items.find(i => i.menuItemId === item.menuItemId);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({ ...item, quantity: 1 });
      }
      calculateTotals(state);
    },
    removeFromCart: (state, action) => {
      const menuItemId = action.payload;
      const existingItem = state.items.find(i => i.menuItemId === menuItemId);
      if (existingItem) {
        if (existingItem.quantity === 1) {
          state.items = state.items.filter(i => i.menuItemId !== menuItemId);
        } else {
          existingItem.quantity -= 1;
        }
      }
      if (state.items.length === 0) {
        state.vendorId = null;
      }
      calculateTotals(state);
    },
    clearCart: (state) => {
      state.items = [];
      state.vendorId = null;
      state.totalItems = 0;
      state.totalAmount = 0;
    }
  },
});

export const { addToCart, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
