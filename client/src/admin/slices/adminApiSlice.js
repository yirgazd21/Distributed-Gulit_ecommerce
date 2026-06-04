import { apiSlice } from '../../store/slices/apiSlice';

const ADMIN_AUTH_URL = '/api/admin/auth';

export const adminApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    adminLogin: builder.mutation({
      query: (data) => ({
        url: `${ADMIN_AUTH_URL}/login`,
        method: 'POST',
        body: data,
      }),
    }),
    adminForgotPassword: builder.mutation({
      query: (data) => ({
        url: `${ADMIN_AUTH_URL}/forgot-password`,
        method: 'POST',
        body: data,
      }),
    }),
    adminResetPassword: builder.mutation({
      query: ({ token, password }) => ({
        url: `${ADMIN_AUTH_URL}/reset-password/${token}`,
        method: 'POST',
        body: { password },
      }),
    }),
    adminGoogleLogin: builder.mutation({
      query: (data) => ({
        url: `${ADMIN_AUTH_URL}/google`,
        method: 'POST',
        body: data,
      }),
    }),
    adminMe: builder.query({
      query: () => ({
        url: `${ADMIN_AUTH_URL}/me`,
      }),
      keepUnusedDataFor: 5,
    }),
    adminStats: builder.query({
      query: () => ({
        url: `${ADMIN_AUTH_URL}/stats`,
      }),
      keepUnusedDataFor: 10,
    }),
    adminGetSellers: builder.query({
      query: ({
        status = 'all',
        keyword = '',
        category = 'all',
        country = 'all',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 10,
      } = {}) => ({
        url: `/api/admin/sellers?status=${encodeURIComponent(status)}&keyword=${encodeURIComponent(keyword)}&category=${encodeURIComponent(
          category
        )}&country=${encodeURIComponent(country)}&sortBy=${encodeURIComponent(sortBy)}&sortOrder=${encodeURIComponent(
          sortOrder
        )}&page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`,
      }),
      keepUnusedDataFor: 5,
      providesTags: ['AdminSeller'],
    }),
    adminUpdateSellerStatus: builder.mutation({
      query: ({ sellerId, ...body }) => ({
        url: `/api/admin/sellers/${sellerId}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminSeller', 'Order'],
    }),
    adminExportSellersCsv: builder.mutation({
      query: ({
        status = 'all',
        keyword = '',
        category = 'all',
        country = 'all',
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = {}) => ({
        url: `/api/admin/sellers/export?status=${encodeURIComponent(status)}&keyword=${encodeURIComponent(
          keyword
        )}&category=${encodeURIComponent(category)}&country=${encodeURIComponent(country)}&sortBy=${encodeURIComponent(
          sortBy
        )}&sortOrder=${encodeURIComponent(sortOrder)}`,
        method: 'GET',
        responseHandler: async (response) => response.text(),
      }),
    }),
    adminGetSellerDetails: builder.query({
      query: (sellerId) => ({
        url: `/api/admin/sellers/${sellerId}`,
      }),
      keepUnusedDataFor: 5,
      providesTags: ['AdminSeller'],
    }),
    adminGetSellerTransactions: builder.query({
      query: ({ sellerId, page = 1, limit = 10 } = {}) => ({
        url: `/api/admin/sellers/${sellerId}/transactions?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`,
      }),
      keepUnusedDataFor: 5,
      providesTags: ['AdminSeller'],
    }),
    adminGetSellerProducts: builder.query({
      query: ({ sellerId, page = 1, limit = 8, keyword = '', stock = 'all' } = {}) => ({
        url: `/api/admin/sellers/${sellerId}/products?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(
          limit
        )}&keyword=${encodeURIComponent(keyword)}&stock=${encodeURIComponent(stock)}`,
      }),
      keepUnusedDataFor: 5,
      providesTags: ['AdminSeller'],
    }),
    adminGetSellerOrders: builder.query({
      query: ({ sellerId, page = 1, limit = 10, keyword = '', status = 'all', risk = 'all' } = {}) => ({
        url: `/api/admin/sellers/${sellerId}/orders?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(
          limit
        )}&keyword=${encodeURIComponent(keyword)}&status=${encodeURIComponent(status)}&risk=${encodeURIComponent(risk)}`,
      }),
      keepUnusedDataFor: 5,
      providesTags: ['AdminSeller'],
    }),
    adminGetSellerActivity: builder.query({
      query: ({
        sellerId,
        page = 1,
        limit = 10,
        action = 'all',
        severity = 'all',
        dateFrom = '',
        dateTo = '',
      } = {}) => ({
        url: `/api/admin/sellers/${sellerId}/activity?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(
          limit
        )}&action=${encodeURIComponent(action)}&severity=${encodeURIComponent(severity)}&dateFrom=${encodeURIComponent(
          dateFrom
        )}&dateTo=${encodeURIComponent(dateTo)}`,
      }),
      keepUnusedDataFor: 5,
      providesTags: ['AdminSeller'],
    }),
    adminAddSellerNote: builder.mutation({
      query: ({ sellerId, note, severity }) => ({
        url: `/api/admin/sellers/${sellerId}/notes`,
        method: 'POST',
        body: { note, severity },
      }),
      invalidatesTags: ['AdminSeller'],
    }),
    adminGetUsers: builder.query({
      query: ({
        keyword = '',
        role = 'all',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 10,
      } = {}) => ({
        url: `/api/admin/users?keyword=${encodeURIComponent(keyword)}&role=${encodeURIComponent(role)}&sortBy=${encodeURIComponent(
          sortBy
        )}&sortOrder=${encodeURIComponent(sortOrder)}&page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`,
      }),
      keepUnusedDataFor: 5,
      providesTags: ['AdminUser'],
    }),
    adminUpdateUserRole: builder.mutation({
      query: ({ userId, role }) => ({
        url: `/api/admin/users/${userId}/role`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: ['AdminUser'],
    }),
    adminGetOrders: builder.query({
      query: ({
        page = 1,
        limit = 12,
        keyword = '',
        payment = 'all',
        delivery = 'all',
        dispute = 'all',
        risk = 'all',
      } = {}) => ({
        url: `/api/admin/orders?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}&keyword=${encodeURIComponent(
          keyword
        )}&payment=${encodeURIComponent(payment)}&delivery=${encodeURIComponent(delivery)}&dispute=${encodeURIComponent(
          dispute
        )}&risk=${encodeURIComponent(risk)}`,
      }),
      keepUnusedDataFor: 5,
      providesTags: ['AdminOrder'],
    }),
    adminUpdateOrderDispute: builder.mutation({
      query: ({ orderId, disputeStatus, disputeNote }) => ({
        url: `/api/admin/orders/${orderId}/dispute`,
        method: 'PATCH',
        body: { disputeStatus, disputeNote },
      }),
      invalidatesTags: ['AdminOrder'],
    }),
    adminGetFinanceOverview: builder.query({
      query: ({ page = 1, limit = 12, keyword = '' } = {}) => ({
        url: `/api/admin/finance?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}&keyword=${encodeURIComponent(
          keyword
        )}`,
      }),
      keepUnusedDataFor: 5,
      providesTags: ['AdminFinance'],
    }),
    adminExportFinanceReport: builder.mutation({
      query: ({ range = '30d' } = {}) => ({
        url: `/api/admin/finance/export?range=${encodeURIComponent(range)}`,
        method: 'GET',
        responseHandler: async (response) => response.text(),
      }),
    }),
    adminGetSupportInbox: builder.query({
      query: ({ page = 1, limit = 12, keyword = '', type = 'all', status = 'all' } = {}) => ({
        url: `/api/admin/support?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}&keyword=${encodeURIComponent(
          keyword
        )}&type=${encodeURIComponent(type)}&status=${encodeURIComponent(status)}`,
      }),
      keepUnusedDataFor: 5,
      providesTags: ['AdminSupport'],
    }),
    adminReplySupportThread: builder.mutation({
      query: ({ threadId, message }) => ({
        url: `/api/admin/support/threads/${threadId}/reply`,
        method: 'POST',
        body: { message },
      }),
      invalidatesTags: ['AdminSupport'],
    }),
    adminUpdateSupportThreadStatus: builder.mutation({
      query: ({ threadId, status }) => ({
        url: `/api/admin/support/threads/${threadId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['AdminSupport'],
    }),
    adminSendSupportMessage: builder.mutation({
      query: (data) => ({
        url: '/api/admin/support/messages',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['AdminSupport'],
    }),
    adminGetPlatformUpdates: builder.query({
      query: ({ audience = 'all', status = 'all', page = 1, limit = 20 } = {}) => ({
        url: `/api/admin/system/updates?audience=${encodeURIComponent(audience)}&status=${encodeURIComponent(
          status
        )}&page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`,
      }),
      keepUnusedDataFor: 5,
      providesTags: ['AdminSupport'],
    }),
    adminCreatePlatformUpdate: builder.mutation({
      query: (data) => ({
        url: '/api/admin/system/updates',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['AdminSupport'],
    }),
    adminUpdatePlatformUpdate: builder.mutation({
      query: ({ updateId, ...body }) => ({
        url: `/api/admin/system/updates/${updateId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminSupport'],
    }),
    adminGetCategories: builder.query({
      query: () => ({
        url: '/api/categories/admin',
      }),
      keepUnusedDataFor: 5,
      providesTags: ['Category'],
    }),
    adminCreateCategory: builder.mutation({
      query: (data) => ({
        url: '/api/categories/admin',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Category'],
    }),
    adminUpdateCategory: builder.mutation({
      query: ({ categoryId, ...body }) => ({
        url: `/api/categories/admin/${categoryId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Category'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useAdminLoginMutation,
  useAdminForgotPasswordMutation,
  useAdminResetPasswordMutation,
  useAdminGoogleLoginMutation,
  useAdminMeQuery,
  useAdminStatsQuery,
  useAdminGetSellersQuery,
  useAdminUpdateSellerStatusMutation,
  useAdminExportSellersCsvMutation,
  useAdminGetSellerDetailsQuery,
  useAdminGetSellerTransactionsQuery,
  useAdminGetSellerProductsQuery,
  useAdminGetSellerOrdersQuery,
  useAdminGetSellerActivityQuery,
  useAdminAddSellerNoteMutation,
  useAdminGetUsersQuery,
  useAdminUpdateUserRoleMutation,
  useAdminGetOrdersQuery,
  useAdminUpdateOrderDisputeMutation,
  useAdminGetFinanceOverviewQuery,
  useAdminExportFinanceReportMutation,
  useAdminGetSupportInboxQuery,
  useAdminReplySupportThreadMutation,
  useAdminUpdateSupportThreadStatusMutation,
  useAdminSendSupportMessageMutation,
  useAdminGetPlatformUpdatesQuery,
  useAdminCreatePlatformUpdateMutation,
  useAdminUpdatePlatformUpdateMutation,
  useAdminGetCategoriesQuery,
  useAdminCreateCategoryMutation,
  useAdminUpdateCategoryMutation,
} = adminApiSlice;
