import { createSlice } from '@reduxjs/toolkit';
import { updateCart } from '../../utils/cartUtils';

// Initial state — no longer reads from localStorage
// Cart is loaded from DB on login via loadCartFromDB action
const initialState = {
  cartItems: [],
  shippingAddress: localStorage.getItem('shippingAddress')
    ? JSON.parse(localStorage.getItem('shippingAddress'))
    : {},
  paymentMethod: localStorage.getItem('paymentMethod') || 'Chapa',
  itemsPrice: 0,
  shippingPrice: 0,
  taxPrice: 0,
  totalPrice: 0,
};

const getCartItemId = (item) => item.cartItemId || `${item._id || item.product}-${item.selectedImage || item.image}`;

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Optimistic local add — DB sync is done separately via useAddToCartDBMutation
    addToCart: (state, action) => {
      const item = {
        ...action.payload,
        cartItemId: getCartItemId(action.payload),
      };
      const existItem = state.cartItems.find((x) => getCartItemId(x) === item.cartItemId);
      if (existItem) {
        state.cartItems = state.cartItems.map((x) =>
          getCartItemId(x) === item.cartItemId ? item : x
        );
      } else {
        state.cartItems = [...state.cartItems, item];
      }
      return updateCart(state);
    },

    // Optimistic local remove — DB sync done via useRemoveFromCartDBMutation
    removeFromCart: (state, action) => {
      state.cartItems = state.cartItems.filter(
        (x) => getCartItemId(x) !== action.payload && x._id !== action.payload && x.product !== action.payload
      );
      return updateCart(state);
    },

    saveShippingAddress: (state, action) => {
      state.shippingAddress = action.payload;
      localStorage.setItem('shippingAddress', JSON.stringify(action.payload));
      return updateCart(state);
    },

    savePaymentMethod: (state, action) => {
      state.paymentMethod = action.payload;
      localStorage.setItem('paymentMethod', action.payload);
      return updateCart(state);
    },

    // Called after order is placed or on logout
    clearCartItems: (state) => {
      state.cartItems = [];
      return updateCart(state);
    },

    // Remove specific paid items by product _id
    removePaidItems: (state, action) => {
      const idsToRemove = Array.isArray(action.payload) ? action.payload.map(String) : [];
      if (idsToRemove.length === 0) return state;
      state.cartItems = state.cartItems.filter(
        (x) => !idsToRemove.includes(String(x._id)) && !idsToRemove.includes(String(x.product))
      );
      return updateCart(state);
    },

    // Load cart from DB response (called on login / app init)
    loadCartFromDB: (state, action) => {
      const { cartItems, itemsPrice, shippingPrice, taxPrice, totalPrice } = action.payload;
      state.cartItems = cartItems || [];
      state.itemsPrice = itemsPrice || 0;
      state.shippingPrice = shippingPrice || 0;
      state.taxPrice = taxPrice || 0;
      state.totalPrice = totalPrice || 0;
      return state;
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  saveShippingAddress,
  savePaymentMethod,
  clearCartItems,
  removePaidItems,
  loadCartFromDB,
} = cartSlice.actions;

export default cartSlice.reducer;
