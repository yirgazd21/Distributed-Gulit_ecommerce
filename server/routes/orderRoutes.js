const express = require('express');
const { emitToAll } = require('../utils/peerSync');
const {
  addOrderItems,
  getOrderById,
  getMyOrders,
  updateOrderToPaid,
  updateOrderToDelivered,
  requestOrderRefund,
  verifyChapaPayment,
  cancelPendingOrder,
  removeUserOrder,
} = require('../controllers/orderController');

const { protect } = require('../middleware/authMiddleware');
const { initializeChapaPayment } = require('../controllers/paymentController');

module.exports = (io) => {
  const router = express.Router();

  // Attach io to every request — emit() is wrapped to also notify the peer server
  router.use((req, _res, next) => {
    req.io = {
      emit: (event, payload) => emitToAll(io, event, payload),
    };
    next();
  });

  router.route('/').post(protect, addOrderItems);
  router.route('/myorders').get(protect, getMyOrders);

  router.post('/chapa/init', protect, initializeChapaPayment);

  router.route('/:id').get(protect, getOrderById);
  router.route('/:id/pay').put(protect, updateOrderToPaid);
  router.route('/:id/chapa/verify').post(protect, verifyChapaPayment);
  router.route('/:id/deliver').put(protect, updateOrderToDelivered);
  router.route('/:id/refund').put(protect, requestOrderRefund);
  router.route('/:id/cancel').delete(protect, cancelPendingOrder);
  router.route('/:id/remove').delete(protect, removeUserOrder);

  return router;
};
