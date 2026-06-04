const express = require('express');
const { emitToAll } = require('../utils/peerSync');
const {
  getSellerProducts,
  createSellerProduct,
  updateSellerProduct,
  deleteSellerProduct,
} = require('../controllers/sellerProductController');
const { protectSeller } = require('../middleware/authMiddleware');

module.exports = (io) => {
  const router = express.Router();

  // Attach io to every request — emit() is wrapped to also notify the peer server
  router.use((req, _res, next) => {
    req.io = {
      emit: (event, payload) => emitToAll(io, event, payload),
    };
    next();
  });

  router.route('/')
    .get(protectSeller, getSellerProducts)
    .post(protectSeller, createSellerProduct);

  router.route('/:id')
    .put(protectSeller, updateSellerProduct)
    .delete(protectSeller, deleteSellerProduct);

  return router;
};
