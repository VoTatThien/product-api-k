const Product = require("../models/Product");

// @desc    Get all products
// @route   GET /api/products
const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single product by pid
// @route   GET /api/products/:pid
const getProductByPid = async (req, res) => {
  try {
    const product = await Product.findOne({ pid: req.params.pid });
    if (!product) {
      return res.status(404).json({ success: false, message: `Product with pid '${req.params.pid}' not found` });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new product
// @route   POST /api/products
const createProduct = async (req, res) => {
  try {
    const { pid, pname, price, quantity } = req.body;

    // Check required fields
    if (!pid || !pname || price === undefined || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: pid, pname, price, quantity",
      });
    }

    // Check duplicate pid
    const existingProduct = await Product.findOne({ pid });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: `Product with pid '${pid}' already exists`,
      });
    }

    const product = await Product.create({ pid, pname, price, quantity });
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update a product by pid
// @route   PUT /api/products/:pid
const updateProduct = async (req, res) => {
  try {
    const { pname, price, quantity } = req.body;

    const product = await Product.findOneAndUpdate(
      { pid: req.params.pid },
      { pname, price, quantity },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: `Product with pid '${req.params.pid}' not found` });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a product by pid
// @route   DELETE /api/products/:pid
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ pid: req.params.pid });
    if (!product) {
      return res.status(404).json({ success: false, message: `Product with pid '${req.params.pid}' not found` });
    }

    res.status(200).json({
      success: true,
      message: `Product with pid '${req.params.pid}' deleted successfully`,
      deletedProduct: product,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductByPid,
  createProduct,
  updateProduct,
  deleteProduct,
};
