export const PRODUCT_SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'price', label: 'Price' },
  { value: 'popular', label: 'Popular' },
  { value: 'alphabet', label: 'Alphabetical' },
];

const getTime = (value) => {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const sortProducts = (products = [], sortBy = 'latest') => {
  const sortedProducts = [...products];

  sortedProducts.sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return Number(a.price || 0) - Number(b.price || 0);
      case 'popular':
        return (
          Number(b.numReviews || 0) - Number(a.numReviews || 0) ||
          Number(b.rating || 0) - Number(a.rating || 0) ||
          getTime(b.createdAt) - getTime(a.createdAt)
        );
      case 'alphabet':
        return String(a.name || '').localeCompare(String(b.name || ''), undefined, {
          sensitivity: 'base',
        });
      case 'latest':
      default:
        return getTime(b.createdAt) - getTime(a.createdAt);
    }
  });

  return sortedProducts;
};

export const filterProductsByPrice = (products = [], { minPrice = '', maxPrice = '' } = {}) => {
  const min = minPrice === '' ? null : Number(minPrice);
  const max = maxPrice === '' ? null : Number(maxPrice);

  return products.filter((product) => {
    const price = Number(product.price || 0);
    const aboveMin = min === null || Number.isNaN(min) || price >= min;
    const belowMax = max === null || Number.isNaN(max) || price <= max;
    return aboveMin && belowMax;
  });
};

export const filterAndSortProducts = (products = [], sortBy = 'latest', priceRange = {}) => {
  return sortProducts(filterProductsByPrice(products, priceRange), sortBy);
};
