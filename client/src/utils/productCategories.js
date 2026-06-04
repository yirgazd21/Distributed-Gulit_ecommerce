export const PRODUCT_CATEGORIES = [
  { label: 'Electronics', value: 'Electronics' },
  { label: 'Clothing', value: 'Clothing' },
  { label: 'Home & Kitchen', value: 'Home & Kitchen' },
  { label: 'Books', value: 'Books' },
  { label: 'Beauty', value: 'Beauty' },
  { label: 'Other', value: 'Other' },
];

export const getCategoryPath = (category) => `/category/${encodeURIComponent(category.value)}`;
