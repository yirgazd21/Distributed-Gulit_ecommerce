import React from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaEdit, FaTrash, FaPlus, FaBoxOpen, FaSpinner, FaExclamationTriangle, FaFlag } from 'react-icons/fa';
import { 
  useGetSellerProductsQuery, 
  useDeleteSellerProductMutation 
} from '../../store/slices/sellerProductsApiSlice';
import { buildMediaUrl, handleMediaError } from '../../utils/mediaUrl';

const SellerProductListScreen = () => {
  const { data: products, isLoading, error, refetch } = useGetSellerProductsQuery();
  const [deleteSellerProduct, { isLoading: loadingDelete }] = useDeleteSellerProductMutation();
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;

  const deleteHandler = async (id) => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      try {
        await deleteSellerProduct(id).unwrap();
        toast.success('Product deleted successfully');
        refetch();
      } catch (err) {
        toast.error(err?.data?.message || err.error);
      }
    }
  };

  const getDiscountPercentage = (product) => {
    if (!product.originalPrice || product.originalPrice <= product.price) return 0;
    return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  };

  const totalItems = products ? products.length : 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = products ? products.slice(startIndex, startIndex + itemsPerPage) : [];

  React.useEffect(() => {
    if (products) {
      const maxPages = Math.ceil(products.length / itemsPerPage);
      if (currentPage > maxPages && maxPages > 0) {
        setCurrentPage(maxPages);
      }
    }
  }, [products, currentPage, itemsPerPage]);

  return (
    <div className="w-full animate-fade-in-up">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <FaBoxOpen className="text-green-500" /> Manage Products
          </h1>
          <p className="text-gray-400 mt-1">View, edit, and organize your store's inventory.</p>
        </div>
        
        <Link 
          to="/seller/products/add" 
          className="bg-green-500 hover:bg-green-400 text-[#0f172a] font-bold px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.6)] hover:-translate-y-0.5 flex items-center gap-2"
        >
          <FaPlus /> Add New Product
        </Link>
      </div>

      {loadingDelete && <div className="text-green-500 mb-4 font-bold flex items-center gap-2"><FaSpinner className="animate-spin" /> Deleting product...</div>}
      
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <FaSpinner className="animate-spin text-5xl text-green-500" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex items-center gap-3">
          <FaExclamationTriangle className="text-2xl" />
          <p>{error?.data?.message || error.error}</p>
        </div>
      ) : products && products.length === 0 ? (
        <div className="bg-[#1e293b] border border-gray-700 rounded-[2rem] p-16 text-center shadow-xl flex flex-col items-center">
          <div className="w-24 h-24 bg-[#0f172a] rounded-full flex items-center justify-center mb-6 border border-gray-800 shadow-inner">
            <FaBoxOpen className="text-5xl text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Your inventory is empty</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">You haven't added any products to your store yet. List your first item to start reaching millions of buyers!</p>
          <Link 
            to="/seller/products/add" 
            className="bg-[#0f172a] hover:bg-gray-800 border border-green-500/50 text-green-400 font-bold px-8 py-4 rounded-xl transition-all hover:border-green-400 hover:-translate-y-1 flex items-center gap-2"
          >
            <FaPlus /> Create Your First Product
          </Link>
        </div>
      ) : (
        <div className="bg-[#1e293b] rounded-3xl border border-gray-700 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0f172a]/80 text-gray-400 text-sm uppercase tracking-wider">
                  <th className="p-5 font-bold border-b border-gray-700">Image</th>
                  <th className="p-5 font-bold border-b border-gray-700">NAME</th>
                  <th className="p-5 font-bold border-b border-gray-700">PRICE</th>
                  <th className="p-5 font-bold border-b border-gray-700">DISCOUNT</th>
                  <th className="p-5 font-bold border-b border-gray-700">CATEGORY</th>
                  <th className="p-5 font-bold border-b border-gray-700">BRAND</th>
                  <th className="p-5 font-bold border-b border-gray-700">STOCK</th>
                  <th className="p-5 font-bold border-b border-gray-700 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {paginatedProducts.map((product) => {
                  const discountPercentage = getDiscountPercentage(product);
                  const isOutOfStock = product.countInStock <= 0;
                  return (
                    <tr key={product._id} className={`transition-colors group ${isOutOfStock ? 'bg-red-500/10 hover:bg-red-500/15' : 'hover:bg-white/5'}`}>
                      <td className="p-5 relative">
                        <img 
                          src={buildMediaUrl(product.image)}
                          alt={product.name} 
                          className="w-12 h-12 object-cover rounded-lg border border-gray-700 bg-[#0f172a]"
                          onError={handleMediaError(product.image)}
                        />
                        {isOutOfStock && (
                          <div className="absolute -top-2 -right-2">
                            <FaFlag className="text-red-500 text-lg" title="Out of Stock" />
                          </div>
                        )}
                      </td>
                      <td className="p-5 text-white font-bold">
                        {product.name}
                        {isOutOfStock && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-black text-red-300">
                            Out of Stock
                          </span>
                        )}
                      </td>
                      <td className="p-5">
                        <span className="block text-green-400 font-bold">{product.price} ETB</span>
                        {discountPercentage > 0 && (
                          <span className="text-xs text-gray-500 line-through">
                            {product.originalPrice} ETB
                          </span>
                        )}
                      </td>
                      <td className="p-5">
                        {discountPercentage > 0 ? (
                          <span className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-black text-red-300">
                            -{discountPercentage}%
                          </span>
                        ) : (
                          <span className="text-gray-500 text-sm font-bold">No discount</span>
                        )}
                      </td>
                      <td className="p-5 text-gray-300">{product.category}</td>
                      <td className="p-5 text-gray-300">{product.brand}</td>
                      <td className="p-5">
                        {!isOutOfStock ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                            {product.countInStock} In Stock
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                            <FaExclamationTriangle className="text-xs" /> Out of Stock
                          </span>
                        )}
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex justify-end gap-3">
                          <Link 
                            to={`/seller/products/${product._id}/edit`}
                            className="w-10 h-10 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center transition-colors border border-blue-500/20"
                            title="Edit Product"
                          >
                            <FaEdit />
                          </Link>
                          <button 
                            onClick={() => deleteHandler(product._id)}
                            className="w-10 h-10 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center transition-colors border border-red-500/20"
                            title="Delete Product"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-[#0f172a]/40 border-t border-gray-700/50 gap-4">
              <span className="text-sm text-gray-400">
                Showing <span className="text-white font-bold">{startIndex + 1}</span> to <span className="text-white font-bold">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of <span className="text-white font-bold">{totalItems}</span> products
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50 disabled:hover:bg-gray-800 disabled:cursor-not-allowed transition-all border border-gray-700 flex items-center justify-center font-black"
                >
                  &lt;
                </button>
                <span className="text-sm text-white font-black px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50 disabled:hover:bg-gray-800 disabled:cursor-not-allowed transition-all border border-gray-700 flex items-center justify-center font-black"
                >
                  &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SellerProductListScreen;
