import { apiSlice } from './apiSlice';

export const sellersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    // 1. Seller Login
    sellerLogin: builder.mutation({
      query: (data) => ({
        url: '/api/sellers/login',
        method: 'POST',
        body: data,
      }),
    }),

    sellerGoogleLogin: builder.mutation({
      query: (data) => ({
        url: '/api/sellers/google/login',
        method: 'POST',
        body: data,
      }),
    }),

    sellerGoogleIdentity: builder.mutation({
      query: (data) => ({
        url: '/api/sellers/google/identity',
        method: 'POST',
        body: data,
      }),
    }),

    sellerForgotPassword: builder.mutation({
      query: (data) => ({
        url: '/api/sellers/forgot-password',
        method: 'POST',
        body: data,
      }),
    }),

    sellerResetPassword: builder.mutation({
      query: ({ token, password }) => ({
        url: `/api/sellers/reset-password/${token}`,
        method: 'POST',
        body: { password },
      }),
    }),

    // 2. Seller Registration
    sellerRegister: builder.mutation({
      query: (formData) => ({
        url: '/api/sellers',
        method: 'POST',
        body: formData,
      }),
    }),

    // 3. Seller Logout
    sellerLogoutApi: builder.mutation({
      query: () => ({
        url: '/api/sellers/logout',
        method: 'POST',
      }),
    }),

    // Wallet
    getSellerWallet: builder.query({
      query: () => ({
        url: '/api/sellers/wallet',
      }),
      keepUnusedDataFor: 5,
    }),

    // Settings
    getSellerSettings: builder.query({
      query: () => ({
        url: '/api/sellers/settings',
      }),
      keepUnusedDataFor: 5,
    }),

    updateSellerSettings: builder.mutation({
      query: (data) => ({
        url: '/api/sellers/settings',
        method: 'PUT',
        body: data,
      }),
    }),

    // =========================
    // SUPPORT INBOX (FIXED)
    // =========================

    getSellerSupportInbox: builder.query({
      query: () => ({
        url: '/api/sellers/support/inbox',
      }),
      keepUnusedDataFor: 5,
      providesTags: ['SellerSupport'],
    }),

    createSellerSupportTicket: builder.mutation({
      query: (data) => ({
        url: '/api/sellers/support/tickets',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['SellerSupport'],
    }),

    replySellerSupportThread: builder.mutation({
      query: ({ threadId, message }) => ({
        url: `/api/sellers/support/threads/${threadId}/reply`,
        method: 'POST',
        body: { message },
      }),
      invalidatesTags: ['SellerSupport'],
    }),

    markSellerSupportThreadRead: builder.mutation({
      query: (threadId) => ({
        url: `/api/sellers/support/threads/${threadId}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['SellerSupport'],
    }),

  }),
});

// Export hooks
export const {
  useSellerLoginMutation,
  useSellerGoogleLoginMutation,
  useSellerGoogleIdentityMutation,
  useSellerForgotPasswordMutation,
  useSellerResetPasswordMutation,
  useSellerRegisterMutation,
  useSellerLogoutApiMutation,
  useGetSellerWalletQuery,
  useGetSellerSettingsQuery,
  useUpdateSellerSettingsMutation,
  useGetSellerSupportInboxQuery,
  useCreateSellerSupportTicketMutation,
  useReplySellerSupportThreadMutation,
  useMarkSellerSupportThreadReadMutation,
} = sellersApiSlice;