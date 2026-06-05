import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { io } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { getActiveBackendUrl } from './utils/networkConfig';
import { loadCartFromDB } from './store/slices/cartSlice';
import { usersApiSlice } from './store/slices/usersApiSlice';
import { apiSlice } from './store/slices/apiSlice';

// Buyer Components
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

// Seller Components
import SellerLayout from './components/seller/SellerLayout';
import SellerRoute from './components/SellerRoute';
import SellerDashboardLayout from './components/seller/SellerDashboardLayout';

// Buyer Pages
import HomeScreen from './pages/HomeScreen';
import LoginScreen from './pages/LoginScreen';
import RegisterScreen from './pages/RegisterScreen';
import ForgotPasswordScreen from './pages/ForgotPasswordScreen';
import ResetPasswordScreen from './pages/ResetPasswordScreen';
import ProductDetailScreen from './pages/ProductDetailScreen';
import ProfileScreen from './pages/ProfileScreen';
import ShippingScreen from './pages/ShippingScreen';
import PaymentScreen from './pages/PaymentScreen';
import PlaceOrderScreen from './pages/PlaceOrderScreen';
import OrderScreen from './pages/OrderScreen';
import CartScreen from './pages/CartScreen';
import CategoryScreen from './pages/CategoryScreen';

// Seller Pages
import SellerLandingScreen from './pages/seller/SellerLandingScreen';
import SellerRegisterScreen from './pages/seller/SellerRegisterScreen';
import SellerLoginScreen from './pages/seller/SellerLoginScreen';
import SellerForgotPasswordScreen from './pages/seller/SellerForgotPasswordScreen';
import SellerResetPasswordScreen from './pages/seller/SellerResetPasswordScreen';
import SellerPendingScreen from './pages/seller/SellerPendingScreen';
import SellerDashboardScreen from './pages/seller/SellerDashboardScreen';
import SellerProductListScreen from './pages/seller/SellerProductListScreen';
import SellerProductEditScreen from './pages/seller/SellerProductEditScreen';
import SellerOrderListScreen from './pages/seller/SellerOrderListScreen';
import SellerOrderDetailsScreen from './pages/seller/SellerOrderDetailsScreen';
import SellerWalletScreen from './pages/seller/SellerWalletScreen';
import SellerSettingsScreen from './pages/seller/SellerSettingsScreen';
import SellerHelpCenterScreen from './pages/seller/SellerHelpCenterScreen';
import SellerRulesCenterScreen from './pages/seller/SellerRulesCenterScreen';
import SellerInboxScreen from './pages/seller/SellerInboxScreen';
import SellerRefundRequestsScreen from './pages/seller/SellerRefundRequestsScreen';

// Admin Pages
import AdminLoginScreen from './admin/pages/AdminLoginScreen';
import AdminForgotPasswordScreen from './admin/pages/AdminForgotPasswordScreen';
import AdminResetPasswordScreen from './admin/pages/AdminResetPasswordScreen';
import AdminDashboardScreen from './admin/pages/AdminDashboardScreen';
import AdminSellerReviewScreen from './admin/pages/AdminSellerReviewScreen';
import AdminSellerDetailsScreen from './admin/pages/AdminSellerDetailsScreen';
import AdminUserManagementScreen from './admin/pages/AdminUserManagementScreen';
import AdminOrdersDisputesScreen from './admin/pages/AdminOrdersDisputesScreen';
import AdminFinanceScreen from './admin/pages/AdminFinanceScreen';
import AdminSupportDeskScreen from './admin/pages/AdminSupportDeskScreen';
import AdminSystemSettingsScreen from './admin/pages/AdminSystemSettingsScreen';
import AdminRouteGuard from './admin/components/AdminRoute';
import { useTheme } from './context/ThemeContext';
import OrderSuccessScreen from './pages/OrderSuccessScreen';

const RouteScopeSync = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    let scope = 'buyer';
    if (pathname.startsWith('/admin')) {
      scope = 'admin';
    } else if (pathname.startsWith('/seller') || pathname === '/sell') {
      scope = 'seller';
    }

    document.documentElement.setAttribute('data-scope', scope);
  }, [pathname]);

  return null;
};

const App = () => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.auth);

  const [activeSocketUrl, setActiveSocketUrl] = useState(getActiveBackendUrl());

  useEffect(() => {
    const handleRotation = () => {
      setActiveSocketUrl(getActiveBackendUrl());
    };
    window.addEventListener('backendRotated', handleRotation);
    return () => {
      window.removeEventListener('backendRotated', handleRotation);
    };
  }, []);

  // Load cart from DB on app startup when user is already logged in (e.g. after page refresh)
  useEffect(() => {
    if (!userInfo) return;
    dispatch(
      usersApiSlice.endpoints.getCart.initiate(undefined, { forceRefetch: true })
    ).then((result) => {
      if (result.data) {
        dispatch(loadCartFromDB(result.data));
      }
    }).catch(() => {
      // DB unavailable — cart stays empty in Redux, will reload when DB reconnects
    });
  }, [userInfo, dispatch]);
  useEffect(() => {
    // ─── DYNAMIC ZEROTIER OVERRIDE ───────────────────────────────────────────
    // Automatically target the active socket URL (which updates when rotated)
    console.log(`[Socket] Connecting to: ${activeSocketUrl}`);
    // Normalize URL: remove trailing slash and prefer https when page is https
    let socketUrl = String(activeSocketUrl).replace(/\/$/, '');
    if (window.location.protocol === 'https:' && socketUrl.startsWith('http://')) {
      socketUrl = socketUrl.replace(/^http:\/\//, 'https://');
    }

    // ─────────────────────────────────────────────────────────────────────────

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log(`[Socket] Connected safely via ZeroTier to: ${activeSocketUrl}`);
    });

    socket.on('connect_error', (err) => {
      console.warn(`[Socket] Cannot reach ${activeSocketUrl} — retrying. Details:`, err.message);
    });

    // ─── REAL-TIME PEER SYNC ─────────────────────────────────────────────────
    socket.on('peer-product-added', () => {
      console.log('[Sync] Product change from peer — refreshing');
      dispatch(apiSlice.util.invalidateTags(['Product', 'SellerProduct']));
    });

    socket.on('peer-order-placed', () => {
      console.log('[Sync] Order change from peer — refreshing');
      dispatch(apiSlice.util.invalidateTags(['Order', 'SellerOrder', 'AdminOrder']));
    });
    // ─────────────────────────────────────────────────────────────────────────

    return () => {
      socket.disconnect();
    };
  }, [activeSocketUrl, dispatch]);

  return (
    <Router>
      <RouteScopeSync />
      <Routes>

        {/* =======================================
            🛍️ BUYER ROUTES (Uses standard Layout) 
            ======================================= */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomeScreen />} index />
          <Route path="/search/:keyword" element={<HomeScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="/reset-password/:token" element={<ResetPasswordScreen />} />
          <Route path="/product/:id" element={<ProductDetailScreen />} />

          {/* 🔒 Buyer Routes after login */}
          <Route path="" element={<PrivateRoute />}>
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/shipping" element={<ShippingScreen />} />
            <Route path="/payment" element={<PaymentScreen />} />
            <Route path="/placeorder" element={<PlaceOrderScreen />} />
            <Route path="/order/:id" element={<OrderScreen />} />
            <Route path="/order-success" element={<OrderSuccessScreen />} />
            <Route path="/cart" element={<CartScreen />} />
            <Route path="/category/:categoryName" element={<CategoryScreen />} />
            <Route path="/category/:categoryName/:subcategoryName" element={<CategoryScreen />} />
          </Route>

        </Route>

        {/* =======================================
            🏪 SELLER ROUTES (Uses SellerLayout) 
            ======================================= */}
        <Route element={<SellerLayout />}>
          <Route path="/sell" element={<SellerLandingScreen />} />
          <Route path="/seller/register" element={<SellerRegisterScreen />} />
          <Route path="/seller/login" element={<SellerLoginScreen />} />
          <Route path="/seller/forgot-password" element={<SellerForgotPasswordScreen />} />
          <Route path="/seller/reset-password/:token" element={<SellerResetPasswordScreen />} />
          <Route path="/seller/pending" element={<SellerPendingScreen />} />
          <Route path="/seller/help-center" element={<SellerHelpCenterScreen />} />
          <Route path="/seller/rules-center" element={<SellerRulesCenterScreen />} />
        </Route>

        {/* =======================================
            💼 APPROVED SELLER WORKSPACE ROUTES 
            ======================================= */}
        <Route element={<SellerDashboardLayout />}>
          <Route path="" element={<SellerRoute />}>
            <Route path="/seller/dashboard" element={<SellerDashboardScreen />} />
            <Route path="/seller/products" element={<SellerProductListScreen />} />
            <Route path="/seller/products/add" element={<SellerProductEditScreen />} />
            <Route path="/seller/products/:id/edit" element={<SellerProductEditScreen />} />
            <Route path="/seller/orders" element={<SellerOrderListScreen />} />
            <Route path="/seller/order/:id" element={<SellerOrderDetailsScreen />} />
            <Route path="/seller/refunds" element={<SellerRefundRequestsScreen />} />
            <Route path="/seller/wallet" element={<SellerWalletScreen />} />
            <Route path="/seller/inbox" element={<SellerInboxScreen />} />
            <Route path="/seller/settings" element={<SellerSettingsScreen />} />
          </Route>
        </Route>

        {/* =======================================
            🛡️ ADMIN ROUTES
            ======================================= */}
        <Route path="/admin/login" element={<AdminLoginScreen />} />
        <Route path="/admin/forgot-password" element={<AdminForgotPasswordScreen />} />
        <Route path="/admin/reset-password/:token" element={<AdminResetPasswordScreen />} />
        <Route element={<AdminRouteGuard />}>
          <Route path="/admin/dashboard" element={<AdminDashboardScreen />} />
          <Route path="/admin/sellers" element={<AdminSellerReviewScreen />} />
          <Route path="/admin/sellers/:id" element={<AdminSellerDetailsScreen />} />
          <Route path="/admin/users" element={<AdminUserManagementScreen />} />
          <Route path="/admin/disputes" element={<AdminOrdersDisputesScreen />} />
          <Route path="/admin/finance" element={<AdminFinanceScreen />} />
          <Route path="/admin/support" element={<AdminSupportDeskScreen />} />
          <Route path="/admin/settings" element={<AdminSystemSettingsScreen />} />
        </Route>

      </Routes>
      <ToastContainer position="top-right" autoClose={3000} theme={theme} />
    </Router>
  );
};

export default App;