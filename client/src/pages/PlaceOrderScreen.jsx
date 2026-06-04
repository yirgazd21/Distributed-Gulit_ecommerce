import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useCreateOrderMutation, useInitializeChapaPaymentMutation } from '../store/slices/ordersApiSlice';
import { clearCartItems, removeFromCart } from '../store/slices/cartSlice';
import { useClearCartDBMutation } from '../store/slices/usersApiSlice';
import CheckoutSteps from '../components/CheckoutSteps';
import { toast } from 'react-toastify';
import { FaMapMarkerAlt, FaCreditCard, FaShoppingBag } from 'react-icons/fa';
import Loader from '../components/Loader';
import { BASE_URL } from '../store/slices/apiSlice';

const PlaceOrderScreen = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const cart = useSelector((state) => state.cart) || {};
  const { userInfo } = useSelector((state) => state.auth) || {};

  const [createOrder, { isLoading: isCreatingOrder }] = useCreateOrderMutation();
  const [initializeChapaPayment, { isLoading: isChapaLoading, error }] = useInitializeChapaPaymentMutation();
  const [clearCartDB] = useClearCartDBMutation();

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Safe cart values with defaults
  const cartItems = cart?.cartItems || [];
  const shippingAddress = cart?.shippingAddress || {};
  const paymentMethod = cart?.paymentMethod || '';
  const itemsPrice = cart?.itemsPrice || 0;
  const shippingPrice = cart?.shippingPrice || 0;
  const taxPrice = cart?.taxPrice || 0;
  const totalPrice = cart?.totalPrice || 0;

  const pendingPayItem = (() => {
    try {
      const stored = localStorage.getItem('pendingPayItem');
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      return null;
    }
  })();

  const activeCartItems = pendingPayItem ? [pendingPayItem] : cartItems;

  const activeTotals = (() => {
    if (!pendingPayItem) {
      return {
        itemsPrice: Number(itemsPrice),
        shippingPrice: Number(shippingPrice),
        taxPrice: Number(taxPrice),
        totalPrice: Number(totalPrice),
      };
    }

    const itemTotal = Number(pendingPayItem.price || 0) * Number(pendingPayItem.qty || 1);
    const fullItemsPrice = Number(itemsPrice) || cartItems.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.qty || 1), 0);
    const shippingForItem = fullItemsPrice > 0 ? Number(shippingPrice || 0) * (itemTotal / fullItemsPrice) : 0;
    const taxForItem = fullItemsPrice > 0 ? Number(taxPrice || 0) * (itemTotal / fullItemsPrice) : 0;
    const totalForItem = Number((itemTotal + shippingForItem + taxForItem).toFixed(2));

    return {
      itemsPrice: Number(itemTotal.toFixed(2)),
      shippingPrice: Number(shippingForItem.toFixed(2)),
      taxPrice: Number(taxForItem.toFixed(2)),
      totalPrice: totalForItem,
    };
  })();

  useEffect(() => {
    if (!shippingAddress?.address) {
      navigate('/shipping');
    } else if (!paymentMethod) {
      navigate('/payment');
    }
  }, [shippingAddress, paymentMethod, navigate]);

  const placeOrderHandler = async () => {
    if (!shippingAddress?.address) {
      toast.error('Shipping address missing');
      return;
    }

    if (!paymentMethod) {
      toast.error('Payment method missing');
      return;
    }

    if (!activeCartItems || activeCartItems.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // ==========================================
    // 1. CASH ON DELIVERY CHECKOUT FLOW
    // ==========================================
    if (paymentMethod !== 'Chapa') {
      try {
        const order = await createOrder({
          orderItems: activeCartItems,
          shippingAddress,
          paymentMethod,
          itemsPrice: activeTotals.itemsPrice,
          shippingPrice: activeTotals.shippingPrice,
          taxPrice: activeTotals.taxPrice,
          totalPrice: activeTotals.totalPrice,
        }).unwrap();

        if (pendingPayItem) {
          dispatch(removeFromCart(pendingPayItem.cartItemId || pendingPayItem._id));
          try { await clearCartDB().unwrap(); } catch (_) { }
          localStorage.removeItem('pendingPayItem');
        } else {
          dispatch(clearCartItems());
          try { await clearCartDB().unwrap(); } catch (_) { }
        }
        navigate(`/order/${order._id}`);
      } catch (err) {
        toast.error(err?.data?.message || 'Order creation failed');
      }
      return;
    }

    // ==========================================
    // 2. CHAPA CHECKOUT FLOW (FIXED RACING ISSUES)
    // ==========================================
    if (activeTotals.totalPrice <= 0) {
      toast.error('Order total must be greater than 0');
      return;
    }

    setIsProcessingPayment(true);

    const paymentTimeout = setTimeout(() => {
      setIsProcessingPayment(false);
      toast.error('Payment request timed out. Please try again.');
    }, 30000);

    try {
      const tx_ref = `gulit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const fullName = userInfo?.name || 'Gulit Customer';
      const firstName = fullName.split(' ')[0] || 'Gulit';
      const lastName = fullName.split(' ').slice(1).join(' ') || 'Customer';

      const sanitizedItems = activeCartItems.map((item) => ({
        _id: item._id,
        name: item.name,
        qty: item.qty,
        image: item.image,
        price: item.price,
        user: item.user,
        seller: item.seller,
        countInStock: item.countInStock,
      }));

      const payload = {
        amount: Number(activeTotals.totalPrice).toFixed(2),
        email: userInfo?.email || 'customer@gulit.com',
        first_name: firstName,
        last_name: lastName,
        tx_ref,
        orderItems: sanitizedItems,
        shippingAddress,
        paymentMethod,
        itemsPrice: activeTotals.itemsPrice,
        shippingPrice: activeTotals.shippingPrice,
        taxPrice: activeTotals.taxPrice,
        totalPrice: activeTotals.totalPrice,
      };

      const res = await initializeChapaPayment(payload).unwrap();
      const checkoutUrl = res?.checkout_url;

      if (checkoutUrl) {
        clearTimeout(paymentTimeout);
        localStorage.setItem('pendingTxRef', tx_ref);
        localStorage.setItem('pendingOrderId', res?.orderId || '');

        // CRITICAL FIX: Do not set processing to false. Let the page stay in loading 
        // state until window context leaves to Chapa gateway to avoid flash errors.
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No checkout URL received from Chapa');
      }
    } catch (err) {
      clearTimeout(paymentTimeout);
      console.error('CHAPA PAYMENT ERROR:', err);
      toast.error(err?.data?.message || err?.message || 'Payment initialization failed');
      // Only release the loading spinner context if there was an actual failure
      setIsProcessingPayment(false);
    }
  };

  // ==========================================
  // 3. CHAPA SINGLE ITEM FLOW
  // ==========================================
  const paySingleItem = async (item) => {
    if (!userInfo) return toast.error('Please login first');
    try {
      setIsProcessingPayment(true);

      const tx_ref = `gulit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const fullName = userInfo?.name || 'Gulit Customer';
      const firstName = fullName.split(' ')[0] || 'Gulit';
      const lastName = fullName.split(' ').slice(1).join(' ') || 'Customer';

      const itemTotal = Number((item.price || 0) * (item.qty || 1));
      const itemsPriceTotal = Number(itemsPrice || 0) || 1;
      const shippingForItem = itemsPriceTotal > 0 ? (Number(shippingPrice || 0) * (itemTotal / itemsPriceTotal)) : 0;
      const taxForItem = itemsPriceTotal > 0 ? (Number(taxPrice || 0) * (itemTotal / itemsPriceTotal)) : 0;
      const totalForItem = Number((itemTotal + shippingForItem + taxForItem).toFixed(2));

      const sanitizedItem = {
        _id: item._id,
        name: item.name,
        qty: item.qty,
        image: item.image,
        price: item.price,
        user: item.user,
        seller: item.seller,
        countInStock: item.countInStock,
      };

      const payload = {
        amount: totalForItem.toFixed(2),
        email: userInfo?.email || 'customer@gulit.com',
        first_name: firstName,
        last_name: lastName,
        tx_ref,
        orderItems: [sanitizedItem],
        shippingAddress,
        paymentMethod,
        itemsPrice: itemTotal,
        shippingPrice: Number(shippingForItem.toFixed(2)),
        taxPrice: Number(taxForItem.toFixed(2)),
        totalPrice: totalForItem,
      };

      const res = await initializeChapaPayment(payload).unwrap();
      const checkoutUrl = res?.checkout_url;

      if (checkoutUrl) {
        localStorage.setItem('pendingTxRef', tx_ref);
        localStorage.setItem('pendingOrderId', res?.orderId || '');
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No checkout URL received from Chapa');
      }
    } catch (err) {
      console.error('Chapa init error:', err);
      toast.error(err?.data?.message || err?.message || 'Payment initialization failed');
      setIsProcessingPayment(false);
    }
  };

  if (!cart) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <CheckoutSteps step1 step2 step3 step4 />

      <div className="w-full mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* LEFT COLUMN */}
        <div className="md:col-span-2 space-y-6">
          {/* SHIPPING */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="text-xl font-bold flex gap-2 items-center">
              <FaMapMarkerAlt className="text-green-500" /> Shipping
            </h2>
            <p className="text-gray-600 mt-2">
              {shippingAddress?.address ? (
                <>
                  {shippingAddress.address}, {shippingAddress.city}, {shippingAddress.country}
                  <br />
                  {shippingAddress.phoneNumber}
                </>
              ) : (
                'No address'
              )}
            </p>
          </div>

          {/* PAYMENT */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="text-xl font-bold flex gap-2 items-center">
              <FaCreditCard className="text-green-500" /> Payment
            </h2>
            <p className="text-gray-600 mt-2">{paymentMethod || 'Not selected'}</p>
          </div>

          {/* ITEMS LIST */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="text-xl font-bold flex gap-2 items-center">
              <FaShoppingBag className="text-green-500" /> Items
            </h2>

            {!activeCartItems || activeCartItems.length === 0 ? (
              <p className="text-red-500">Cart empty</p>
            ) : (
              activeCartItems.map((item, i) => (
                <div key={i} className="flex justify-between border-b py-3 text-sm sm:text-base">
                  <div className="flex gap-3 items-center">
                    <img
                      src={`${BASE_URL}${item.image}`}
                      className="w-12 h-12 rounded object-cover"
                      alt={item.name || 'Product'}
                      onError={(e) => {
                        const pc1Backend = "http://10.40.210.101:3000";
                        const primaryFallback = `${pc1Backend}${item.image}`;
                        if (e.target.src !== primaryFallback) {
                          e.target.src = primaryFallback;
                        } else {
                          e.target.src = '/placeholder.jpg';
                        }
                      }}
                    />
                    <Link to={`/product/${item._id}`} className="hover:underline text-gray-800 font-medium">
                      {item.name || 'Product'}
                    </Link>
                  </div>
                  <div className="text-right">
                    <span>{item.qty || 0} x ETB {item.price || 0}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — ORDER SUMMARY */}
        <div className="bg-white p-6 rounded-2xl shadow border h-fit sticky top-20">
          <h2 className="text-2xl font-bold mb-4">Order Summary</h2>

          <div className="space-y-2 text-gray-600">
            <div className="flex justify-between">
              <span>Items</span>
              <span>ETB {activeTotals.itemsPrice}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>ETB {activeTotals.shippingPrice}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>ETB {activeTotals.taxPrice}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2 text-gray-900">
              <span>Total</span>
              <span className="text-green-600">ETB {activeTotals.totalPrice}</span>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm mt-2">
              {error?.data?.message || error.error || 'An error occurred'}
            </p>
          )}

          <button
            onClick={placeOrderHandler}
            disabled={isChapaLoading || isCreatingOrder || isProcessingPayment || !activeCartItems || activeCartItems.length === 0}
            className="w-full mt-5 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex justify-center items-center min-h-[52px]"
          >
            {isProcessingPayment || isChapaLoading || isCreatingOrder ? <Loader /> : 'Place Order'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default PlaceOrderScreen;