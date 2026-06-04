import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import Loader from '../components/Loader';
import { useVerifyChapaPaymentMutation, useCancelPendingOrderMutation } from '../store/slices/ordersApiSlice';
import { clearCartItems, removePaidItems } from '../store/slices/cartSlice';
import { useClearCartDBMutation, useRemoveFromCartDBMutation } from '../store/slices/usersApiSlice';

const OrderSuccessScreen = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [verifyChapaPayment] = useVerifyChapaPaymentMutation();
  const [cancelPendingOrder] = useCancelPendingOrderMutation();
  const [clearCartDB] = useClearCartDBMutation();
  const [removeFromCartDB] = useRemoveFromCartDBMutation();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [orderDetails, setOrderDetails] = useState(null);

  // Guard against duplicate toasts (React StrictMode or double effect runs)
  const toastShown = useRef(false);
  const verificationStarted = useRef(false);

  const tx_ref =
    searchParams.get('tx_ref') ||
    searchParams.get('trx_ref') ||
    searchParams.get('transaction_id') ||
    searchParams.get('ref') ||
    localStorage.getItem('pendingTxRef');

  const orderId =
    searchParams.get('order_id') ||
    localStorage.getItem('pendingOrderId');

  useEffect(() => {
    if (verificationStarted.current) return;
    verificationStarted.current = true;

    const verifyPayment = async () => {
      try {
        if (!orderId) {
          setErrorMessage('Missing order ID. Cannot verify payment.');
          setLoading(false);
          return;
        }
        if (!tx_ref) {
          setErrorMessage('Missing transaction reference. Cannot verify payment.');
          setLoading(false);
          return;
        }

        const order = await verifyChapaPayment({ orderId, tx_ref }).unwrap();

        localStorage.removeItem('pendingTxRef');
        localStorage.removeItem('pendingOrderId');
        localStorage.removeItem('pendingPayItem');

        // Remove only the items that were paid for in this order
        // from both Redux state and the DB cart.
        // Other cart items must be preserved.
        try {
          const paidProductIds = (order.orderItems || []).map((it) => String(it.product));

          if (paidProductIds.length > 0) {
            // Remove from Redux
            dispatch(removePaidItems(paidProductIds));

            // Remove each paid item from DB cart individually
            // cartItemId in the DB is stored as `${productId}-${image}`
            // We match by productId prefix to find the right cartItemId
            for (const productId of paidProductIds) {
              try {
                await removeFromCartDB(productId).unwrap();
              } catch (_) {
                // Item may not exist in cart anymore — that's fine
              }
            }
          } else {
            // Fallback: no product IDs found, clear everything
            dispatch(clearCartItems());
            await clearCartDB().unwrap();
          }
        } catch (e) {
          // Last resort fallback
          dispatch(clearCartItems());
          try { await clearCartDB().unwrap(); } catch (_) {}
        }

        setOrderDetails(order);
        setSuccess(true);

        // Show success toast only once
        if (!toastShown.current) {
          toastShown.current = true;
          toast.success('Payment verified successfully!');
        }
      } catch (err) {
        console.error('Verification error:', err);

        const serverMsg = err?.data?.message || '';
        const alreadyPaid =
          serverMsg.toLowerCase().includes('already paid') ||
          serverMsg.toLowerCase().includes('order already paid');

        if (alreadyPaid) {
          localStorage.removeItem('pendingTxRef');
          localStorage.removeItem('pendingOrderId');
          localStorage.removeItem('pendingPayItem');
          setSuccess(true);
          if (!toastShown.current) {
            toastShown.current = true;
            toast.success('Payment already confirmed');
          }
        } else {
          const msg = serverMsg || err?.error || 'Payment verification failed. Please contact support if money was deducted.';
          setErrorMessage(msg);
          toast.error(msg);

          if (orderId && !alreadyPaid) {
            try {
              await cancelPendingOrder(orderId).unwrap();
            } catch (cancelErr) {
              console.warn('Failed to cancel pending order:', cancelErr?.data?.message || cancelErr?.error || cancelErr?.message);
            }
            localStorage.removeItem('pendingTxRef');
            localStorage.removeItem('pendingOrderId');
            localStorage.removeItem('pendingPayItem');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [verifyChapaPayment, dispatch, orderId, tx_ref]);

  if (loading) return <Loader />;

  if (!success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center">
          <FaTimesCircle className="text-red-500 text-7xl mx-auto mb-6" />
          <h1 className="text-3xl font-black text-red-600 mb-4">
            Payment Verification Failed
          </h1>
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-start gap-2">
                <FaExclamationTriangle className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
              </div>
            </div>
          )}
          <p className="text-gray-500 mb-8 text-sm">
            Your payment could not be confirmed. If money was deducted, please contact support with your transaction ID.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/cart')}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold transition-colors"
            >
              Back to Cart
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center">
        <FaCheckCircle className="text-green-500 text-7xl mx-auto mb-6" />
        <h1 className="text-3xl font-black text-gray-800 mb-4">
          Payment Successful
        </h1>
        <p className="text-gray-500 mb-8">
          Your payment has been confirmed. Your order is now being processed.
        </p>
        {orderDetails && (
          <div className="bg-gray-50 p-3 rounded-lg mb-6 text-left text-sm">
            <p><strong>Order ID:</strong> {orderDetails._id}</p>
            <p><strong>Total paid:</strong> ETB {orderDetails.totalPrice}</p>
            <p><strong>Payment method:</strong> Chapa</p>
          </div>
        )}
        <div className="space-y-4">
          <button
            onClick={() => navigate(`/order/${orderId}`)}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold"
          >
            View My Order
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessScreen;