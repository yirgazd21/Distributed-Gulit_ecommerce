import React from 'react';
import { Link } from 'react-router-dom';
import { FaTimes, FaCheck, FaEye, FaBox, FaUndoAlt } from 'react-icons/fa';
import { useGetSellerOrdersQuery } from '../../store/slices/sellerProductsApiSlice'; // Adjust path if needed
import Loader from '../../components/Loader';
import { buildMediaUrl, handleMediaError } from '../../utils/mediaUrl';
import { useNavigate } from 'react-router-dom';

const SellerOrderListScreen = () => {
  const { data: orders = [], isLoading, error } = useGetSellerOrdersQuery();
  const formatDate = (value) => (value ? String(value).substring(0, 10) : 'N/A');
  const criteriaLabel = (c) => {
    if (!c) return '';
    const map = {
      damaged_item: 'Damaged',
      wrong_product: 'Wrong product',
      missing_items: 'Missing items',
      product_not_working: 'Not working',
      quality_issue: 'Quality',
      delay_above_5_days: 'Delayed >5d',
      other: 'Other',
    };
    return map[c] || c;
  };
  const latestOrders = [...orders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;

  const totalItems = latestOrders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = latestOrders.slice(startIndex, startIndex + itemsPerPage);

  React.useEffect(() => {
    const maxPages = Math.ceil(latestOrders.length / itemsPerPage);
    if (currentPage > maxPages && maxPages > 0) {
      setCurrentPage(maxPages);
    }
  }, [latestOrders.length, currentPage, itemsPerPage]);
  
  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in-up pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <FaBox className="text-blue-500" /> Customer Orders
          </h1>
          <p className="text-gray-400 mt-2">Manage and track items purchased from your store.</p>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl font-bold">
          {error?.data?.message || error.error}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-[#1e293b] p-12 rounded-3xl border border-gray-700 text-center">
          <FaBox className="text-gray-600 text-6xl mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Orders Yet</h2>
          <p className="text-gray-400">When customers buy your products, they will appear here.</p>
        </div>
      ) : (
        <div className="bg-[#1e293b] rounded-3xl border border-gray-700 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0f172a] border-b border-gray-700 text-xs uppercase tracking-widest text-gray-400 font-black">
                  <th className="p-5">Order ID</th>
                  <th className="p-5">Product</th>
                  <th className="p-5">Date</th>
                  <th className="p-5">Customer</th>
                  <th className="p-5">Total</th>
                  <th className="p-5">Paid</th>
                  <th className="p-5">Status</th>
                  <th className="p-5">Estimated</th>
                  <th className="p-5">Delivered</th>
                  <th className="p-5">Refund</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {paginatedOrders.map((order) => {
                  const firstItem = order.orderItems?.[0];
                  const itemCount = order.orderItems?.length || 0;
                  const isRefunded = order.refundStatus === 'completed';
                  return (
                    <tr key={order._id}
                      onClick={() => navigate(`/seller/order/${order._id}`)}
                      className="hover:bg-white/5 transition-colors group cursor-pointer">
                      <td className="p-5 text-sm font-bold text-gray-300">...{String(order?._id || '').slice(-6) || 'N/A'}</td>
                      <td className="p-5">
                        <div className="flex items-center gap-3 min-w-56">
                          {firstItem?.image ? (
                            <img
                              src={buildMediaUrl(firstItem.image)}
                              alt={firstItem.name}
                              className="h-12 w-12 rounded-xl bg-white object-contain p-1"
                              onError={handleMediaError(firstItem.image)}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-xl bg-white/10" />
                          )}
                          <div>
                            <p className="text-sm font-bold text-white line-clamp-1">{firstItem?.name || 'Order items'}</p>
                            {itemCount > 1 && <p className="text-xs text-gray-400">+{itemCount - 1} more item{itemCount > 2 ? 's' : ''}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-5 text-sm text-gray-400">{formatDate(order?.createdAt)}</td>
                      <td className="p-5 text-sm font-medium text-white">{order.user ? order.user.name : 'Deleted User'}</td>
                      <td className="p-5 text-sm font-black text-green-400">
                        ETB {Number(order?.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-5">
                        {order.isPaid ? (
                          <div className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5">
                            <FaCheck /> {formatDate(order?.paidAt)}
                          </div>
                        ) : (
                          <div className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5">
                            <FaTimes /> Not Paid
                          </div>
                        )}
                      </td>
                      <td className="p-5">
                        {((order.deliveryStatus || (order.isDelivered ? 'delivered' : 'pending')) === 'preparing') ? (
                          <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5">
                            Preparing
                          </div>
                        ) : ((order.deliveryStatus || (order.isDelivered ? 'delivered' : 'pending')) === 'out_for_delivery') ? (
                          <div className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5">
                            Out for Delivery
                          </div>
                        ) : ((order.deliveryStatus || (order.isDelivered ? 'delivered' : 'pending')) === 'delivered') ? (
                          <div className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5">
                            Delivered
                          </div>
                        ) : (
                          <div className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5">
                            Pending
                          </div>
                        )}
                      </td>
                      <td className="p-5 text-sm text-gray-400">{formatDate(order?.estimatedDeliveryDate) || 'TBD'}</td>
                      <td className="p-5">
                        {isRefunded ? (
                          <div className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5">
                            <FaCheck /> Refunded
                          </div>
                        ) : order.isDelivered ? (
                          <div className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5">
                            <FaCheck /> {formatDate(order?.deliveredAt)}
                          </div>
                        ) : (
                          <div className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5">
                            <FaTimes /> Pending
                          </div>
                        )}
                      </td>
                      <td className="p-5">
                        {order.refundStatus === 'requested' ? (
                          <div className="flex flex-col gap-1">
                            <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5">
                              <FaUndoAlt /> Requested
                            </div>
                            {order.refundCriteria && (
                              <div className="text-xs text-gray-300">{criteriaLabel(order.refundCriteria)}</div>
                            )}
                          </div>
                        ) : order.refundStatus === 'completed' ? (
                          <div className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5">
                            <FaCheck /> Refunded
                          </div>
                        ) : order.refundStatus === 'rejected' ? (
                          <div className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5">
                            <FaTimes /> Rejected
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-gray-500">None</div>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        <Link
                          to={`/seller/order/${order._id}`}
                          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all"
                          title="View Order Details"
                        >
                          <FaEye />
                        </Link>
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
                Showing <span className="text-white font-bold">{startIndex + 1}</span> to <span className="text-white font-bold">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of <span className="text-white font-bold">{totalItems}</span> orders
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

export default SellerOrderListScreen;
