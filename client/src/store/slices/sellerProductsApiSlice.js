import { apiSlice } from './apiSlice';

const SELLER_PRODUCTS_URL = '/api/sellers/products';
const SELLER_ORDERS_URL = '/api/sellers/orders';

export const sellerProductsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    
    // 1. Fetch all products owned by the logged-in seller
    getSellerProducts: builder.query({
      query: () => ({
        url: SELLER_PRODUCTS_URL,
      }),
      // providesTags tells Redux to cache this specific list of products
      providesTags: ['SellerProduct'], 
      keepUnusedDataFor: 5,
    }),

    // 2. Create a new product
    createSellerProduct: builder.mutation({
      query: (data) => ({
        url: SELLER_PRODUCTS_URL,
        method: 'POST',
        body: data,
      }),
      // invalidatesTags tells Redux: "Hey, the data changed! Throw away the old cache and fetch the new list automatically!"
      invalidatesTags: ['SellerProduct'], 
    }),

    // 3. Update an existing product
    updateSellerProduct: builder.mutation({
      query: (data) => ({
        url: `${SELLER_PRODUCTS_URL}/${data.productId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['SellerProduct'],
    }),

    // 4. Delete a product
    deleteSellerProduct: builder.mutation({
      query: (productId) => ({
        url: `${SELLER_PRODUCTS_URL}/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SellerProduct'],
    }),
    uploadProductImages: builder.mutation({
      query: (data) => ({
        url: `/api/upload`,
        method: 'POST',
        body: data, // This will be FormData object containing files
      }),
    }),

    getSellerOrders: builder.query({
      query: () => ({
        url: SELLER_ORDERS_URL,
      }),
      providesTags: ['SellerOrder'], // Cache tag for orders
      keepUnusedDataFor: 5,
    }),

    getSellerOrderDetails: builder.query({
      query: (orderId) => ({
        url: `${SELLER_ORDERS_URL}/${orderId}`,
      }),
      providesTags: ['SellerOrder'],
    }),

    deliverSellerOrder: builder.mutation({
      query: (orderId) => ({
        url: `${SELLER_ORDERS_URL}/${orderId}/deliver`,
        method: 'PUT',
      }),
      invalidatesTags: ['SellerOrder'],
    }),
    updateSellerOrderStatus: builder.mutation({
      query: ({ orderId, deliveryStatus, estimatedDeliveryDate }) => ({
        url: `${SELLER_ORDERS_URL}/${orderId}/status`,
        method: 'PUT',
        body: { deliveryStatus, estimatedDeliveryDate },
      }),
      invalidatesTags: ['SellerOrder'],
    }),
    completeSellerOrderRefund: builder.mutation({
      query: (orderId) => ({
        url: `${SELLER_ORDERS_URL}/${orderId}/refund/complete`,
        method: 'PUT',
      }),
      invalidatesTags: ['SellerOrder'],
    }),
    rejectSellerOrderRefund: builder.mutation({
      query: ({ orderId, reason }) => ({
        url: `${SELLER_ORDERS_URL}/${orderId}/refund/reject`,
        method: 'PUT',
        body: { reason },
      }),
      invalidatesTags: ['SellerOrder'],
    }),

  }),
});

export const {
  useGetSellerProductsQuery,
  useCreateSellerProductMutation,
  useUpdateSellerProductMutation,
  useDeleteSellerProductMutation,
  useUploadProductImagesMutation,
  useGetSellerOrdersQuery,
  useGetSellerOrderDetailsQuery,
  useDeliverSellerOrderMutation,  useUpdateSellerOrderStatusMutation,  useCompleteSellerOrderRefundMutation,
  useRejectSellerOrderRefundMutation,
} = sellerProductsApiSlice;
