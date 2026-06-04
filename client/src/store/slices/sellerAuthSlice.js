import { createSlice } from '@reduxjs/toolkit';

// Check if a seller is already logged in from a previous session
const initialState = {
  sellerInfo: localStorage.getItem('sellerInfo')
    ? JSON.parse(localStorage.getItem('sellerInfo'))
    : null,
};

const sellerAuthSlice = createSlice({
  name: 'sellerAuth',
  initialState,
  reducers: {
    setSellerCredentials: (state, action) => {
      state.sellerInfo = action.payload;
      localStorage.setItem('sellerInfo', JSON.stringify(action.payload));
    },
    logoutSeller: (state) => {
      state.sellerInfo = null;
      localStorage.removeItem('sellerInfo');
    },
  },
});

export const { setSellerCredentials, logoutSeller } = sellerAuthSlice.actions;
export default sellerAuthSlice.reducer;