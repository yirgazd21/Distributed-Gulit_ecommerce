import { apiSlice } from './apiSlice';

const USERS_URL = '/api/users'; // Helper constant

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // 🔐 Login
    login: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/login`,
        method: 'POST',
        body: data,
      }),
    }),
    // 📝 Register (Default is Buyer)
    register: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/register`,
        method: 'POST',
        body: data,
      }),
    }),
    googleAuth: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/google`,
        method: 'POST',
        body: data,
      }),
    }),
    forgotPassword: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/forgot-password`,
        method: 'POST',
        body: data,
      }),
    }),
    verifyResetCode: builder.mutation({
      query: ({ email, code }) => ({
        url: `${USERS_URL}/verify-reset-code`,
        method: 'POST',
        body: { email, code },
      }),
    }),
    resetPassword: builder.mutation({
      query: ({ token, password }) => ({
        url: `${USERS_URL}/reset-password/${token}`,
        method: 'POST',
        body: { password },
      }),
    }),
    // 🚪 Logout (Server-side clear cookie if needed, but mostly client-side)
    logout: builder.mutation({
      query: () => ({
        url: `${USERS_URL}/logout`,
        method: 'POST',
      }),
    }),

    profile: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/profile`,
        method: 'PUT',
        body: data,
      }),
    }),
    // Favorites endpoints
    getUserFavorites: builder.query({
      query: () => `${USERS_URL}/favorites`,
      providesTags: ['Favorites'],
    }),
    addToFavorites: builder.mutation({
      query: (productId) => ({
        url: `${USERS_URL}/favorites`,
        method: 'POST',
        body: { productId },
      }),
      invalidatesTags: ['Favorites'],
    }),
    removeFromFavorites: builder.mutation({
      query: (productId) => ({
        url: `${USERS_URL}/favorites/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Favorites'],
    }),
    // Browse history endpoints
    getUserBrowseHistory: builder.query({
      query: () => `${USERS_URL}/browse-history`,
      providesTags: ['BrowseHistory'],
    }),
    addToBrowseHistory: builder.mutation({
      query: (productId) => ({
        url: `${USERS_URL}/browse-history`,
        method: 'POST',
        body: { productId },
      }),
      invalidatesTags: ['BrowseHistory'],
    }),
    removeFromBrowseHistory: builder.mutation({
      query: (productId) => ({
        url: `${USERS_URL}/browse-history/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BrowseHistory'],
    }),

    // ─── Cart endpoints ───────────────────────────────────────────────
    getCart: builder.query({
      query: () => `${USERS_URL}/cart`,
      providesTags: ['Cart'],
    }),
    addToCartDB: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/cart`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Cart'],
    }),
    removeFromCartDB: builder.mutation({
      query: (cartItemId) => ({
        url: `${USERS_URL}/cart/${encodeURIComponent(cartItemId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
    clearCartDB: builder.mutation({
      query: () => ({
        url: `${USERS_URL}/cart`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
    syncCartDB: builder.mutation({
      query: (cartItems) => ({
        url: `${USERS_URL}/cart`,
        method: 'PUT',
        body: { cartItems },
      }),
      invalidatesTags: ['Cart'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGoogleAuthMutation,
  useForgotPasswordMutation,
  useVerifyResetCodeMutation,
  useResetPasswordMutation,
  useLogoutMutation,
  useProfileMutation,
  useGetUserFavoritesQuery,
  useAddToFavoritesMutation,
  useRemoveFromFavoritesMutation,
  useGetUserBrowseHistoryQuery,
  useAddToBrowseHistoryMutation,
  useRemoveFromBrowseHistoryMutation,
  useGetCartQuery,
  useAddToCartDBMutation,
  useRemoveFromCartDBMutation,
  useClearCartDBMutation,
  useSyncCartDBMutation,
} = usersApiSlice;
