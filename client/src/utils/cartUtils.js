export const addDecimals = (num) => {
  return (Math.round(num * 100) / 100).toFixed(2);
};

// Recalculates cart totals in Redux state.
// No longer persists to localStorage — cart lives in the DB.
// shippingAddress and paymentMethod are still persisted separately.
export const updateCart = (state) => {
  // 1. Items price
  state.itemsPrice = addDecimals(
    state.cartItems.reduce((acc, item) => acc + item.price * item.qty, 0)
  );

  // 2. Shipping: free over 1000 ETB, otherwise 50 ETB
  state.shippingPrice = addDecimals(state.itemsPrice > 1000 ? 0 : 50);

  // 3. Tax: 15% VAT
  state.taxPrice = addDecimals(Number((0.15 * state.itemsPrice).toFixed(2)));

  // 4. Total
  state.totalPrice = (
    Number(state.itemsPrice) +
    Number(state.shippingPrice) +
    Number(state.taxPrice)
  ).toFixed(2);

  return state;
};
