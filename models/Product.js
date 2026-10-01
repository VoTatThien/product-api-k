const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    pid: {
      type: String,
      required: [true, "Product ID (pid) is required"],
      unique: true,
      trim: true,
    },
    pname: {
      type: String,
      required: [true, "Product name (pname) is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be a positive number"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity must be a non-negative number"],
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Product", productSchema);
