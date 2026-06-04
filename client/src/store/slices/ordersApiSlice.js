import { apiSlice } from './apiSlice';

export const ordersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createOrder: builder.mutation({
      query: (order) => ({
        url: '/api/orders',
        method: 'POST',
        body: { ...order },
      }),
    }),

    getMyOrders: builder.query({
      query: () => ({
        url: '/api/orders/myorders',
      }),
      providesTags: ['Order'],
      keepUnusedDataFor: 5,
    }),
    getOrderDetails: builder.query({
      query: (orderId) => ({
        url: `/api/orders/${orderId}`,
      }),
      keepUnusedDataFor: 5,
    }),
    // 👇 2. Pay Order
    payOrder: builder.mutation({
      query: ({ orderId, details }) => ({
        url: `/api/orders/${orderId}/pay`,
        method: 'PUT',
        body: { ...details },
      }),
    }),
    verifyChapaPayment: builder.mutation({
      query: ({ orderId, tx_ref }) => ({
        url: `/api/orders/${orderId}/chapa/verify`,
        method: 'POST',
        body: {
          tx_ref,
        },
      }),

      invalidatesTags: ['Order', 'SellerOrder'],
    }),
    deliverOrder: builder.mutation({
      query: (orderId) => ({
        url: `/api/orders/${orderId}/deliver`,
        method: 'PUT',
      }),
      invalidatesTags: ['Order'],
    }),
    requestOrderRefund: builder.mutation({
      query: ({ orderId, criteria, details }) => ({
        url: `/api/orders/${orderId}/refund`,
        method: 'PUT',
        body: { criteria, details },
      }),
      invalidatesTags: ['Order', 'SellerOrder'],
    }),
    initializeChapaPayment: builder.mutation({
      query: (data) => ({
        url: '/api/orders/chapa/init',
        method: 'POST',
        body: data,
      }),
    }),
    cancelPendingOrder: builder.mutation({
      query: (orderId) => ({
        url: `/api/orders/${orderId}/cancel`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Order'],
    }),
    removeOrder: builder.mutation({
  query: (orderId) => ({
    url: `/api/orders/${orderId}/remove`,
    method: 'DELETE',
  }),
  invalidatesTags: ['Order'],
}),
  }),

});

export const {
  useCreateOrderMutation,
  useGetMyOrdersQuery,
  useGetOrderDetailsQuery,
  usePayOrderMutation,
  useVerifyChapaPaymentMutation,
  useDeliverOrderMutation,
  useRequestOrderRefundMutation,
  useInitializeChapaPaymentMutation,
  useCancelPendingOrderMutation,
  useRemoveOrderMutation,
} = ordersApiSlice;
