import { apiSlice } from './apiSlice';

export const platformApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformUpdates: builder.query({
      query: ({ audience }) => ({
        url: `/api/platform/updates?audience=${encodeURIComponent(audience)}`,
      }),
      keepUnusedDataFor: 30,
    }),
  }),
  overrideExisting: false,
});

export const { useGetPlatformUpdatesQuery } = platformApiSlice;
