const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductByPid,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

// /api/products
router.route("/").get(getProducts).post(createProduct);

// /api/products/:pid
router
  .route("/:pid")
  .get(getProductByPid)
  .put(updateProduct)
  .delete(deleteProduct);

module.exports = router;
