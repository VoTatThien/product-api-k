const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");
const Product = require("../models/Product");

// Increase timeout for CI environments
jest.setTimeout(30000);

// Connect to test database before all tests
beforeAll(async () => {
  const mongoUri =
    process.env.MONGO_URI ||
    "mongodb://admin:admin123@localhost:27018/productdb_test?authSource=admin";
  await mongoose.connect(mongoUri);
});

// Clean up the collection before each test
beforeEach(async () => {
  await Product.deleteMany({});
});

// Disconnect after all tests
afterAll(async () => {
  await Product.deleteMany({});
  await mongoose.connection.close();
});

describe("Product RESTful API CRUD Tests", () => {
  const sampleProduct = {
    pid: "P001",
    pname: "Laptop Dell XPS 15",
    price: 1500,
    quantity: 10,
  };

  // ==================== 1. CREATE ====================
  describe("POST /api/products", () => {
    it("should successfully create a new product", async () => {
      const res = await request(app)
        .post("/api/products")
        .send(sampleProduct)
        .expect(201);

      expect(res.body).toHaveProperty("_id");
      expect(res.body.pid).toBe(sampleProduct.pid);
      expect(res.body.pname).toBe(sampleProduct.pname);
      expect(res.body.price).toBe(sampleProduct.price);
      expect(res.body.quantity).toBe(sampleProduct.quantity);
    });

    it("should return 400 if pid already exists (duplicate key error)", async () => {
      await Product.create(sampleProduct);

      const res = await request(app)
        .post("/api/products")
        .send(sampleProduct)
        .expect(400);

      expect(res.body.message).toContain("already exists");
    });

    it("should return 400 if required fields are missing", async () => {
      const res = await request(app)
        .post("/api/products")
        .send({ pid: "P002" })
        .expect(400);

      expect(res.body).toHaveProperty("message");
    });

    it("should return 400 if price is negative", async () => {
      const res = await request(app)
        .post("/api/products")
        .send({ ...sampleProduct, pid: "P003", price: -50 })
        .expect(400);

      expect(res.body).toHaveProperty("message");
    });
  });

  // ==================== 2. READ ALL ====================
  describe("GET /api/products", () => {
    it("should return an empty array when database has no products", async () => {
      const res = await request(app).get("/api/products").expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it("should return all products in the database", async () => {
      await Product.create(sampleProduct);
      await Product.create({
        pid: "P002",
        pname: "MacBook Pro M3",
        price: 2400,
        quantity: 5,
      });

      const res = await request(app).get("/api/products").expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });
  });

  // ==================== 3. READ ONE BY PID ====================
  describe("GET /api/products/:pid", () => {
    it("should return a single product by its pid", async () => {
      await Product.create(sampleProduct);

      const res = await request(app)
        .get(`/api/products/${sampleProduct.pid}`)
        .expect(200);

      expect(res.body.pid).toBe(sampleProduct.pid);
      expect(res.body.pname).toBe(sampleProduct.pname);
      expect(res.body.price).toBe(sampleProduct.price);
      expect(res.body.quantity).toBe(sampleProduct.quantity);
    });

    it("should return 404 if product does not exist", async () => {
      const res = await request(app)
        .get("/api/products/NONEXISTENT_PID")
        .expect(404);

      expect(res.body.message).toContain("not found");
    });
  });

  // ==================== 4. UPDATE ====================
  describe("PUT /api/products/:pid", () => {
    it("should update an existing product by pid", async () => {
      await Product.create(sampleProduct);

      const updatedInfo = {
        pname: "Dell XPS 15 2026 Edition",
        price: 1800,
        quantity: 20,
      };

      const res = await request(app)
        .put(`/api/products/${sampleProduct.pid}`)
        .send(updatedInfo)
        .expect(200);

      expect(res.body.pname).toBe(updatedInfo.pname);
      expect(res.body.price).toBe(updatedInfo.price);
      expect(res.body.quantity).toBe(updatedInfo.quantity);
      expect(res.body.pid).toBe(sampleProduct.pid);
    });

    it("should return 404 if updating nonexistent product", async () => {
      const res = await request(app)
        .put("/api/products/NONEXISTENT_PID")
        .send({ pname: "New Name", price: 100, quantity: 2 })
        .expect(404);

      expect(res.body.message).toContain("not found");
    });

    it("should return 400 if update contains negative price", async () => {
      await Product.create(sampleProduct);

      const res = await request(app)
        .put(`/api/products/${sampleProduct.pid}`)
        .send({ price: -100 })
        .expect(400);

      expect(res.body).toHaveProperty("message");
    });
  });

  // ==================== 5. DELETE ====================
  describe("DELETE /api/products/:pid", () => {
    it("should delete an existing product by pid", async () => {
      await Product.create(sampleProduct);

      const res = await request(app)
        .delete(`/api/products/${sampleProduct.pid}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("deleted successfully");

      // Verify deletion
      await request(app)
        .get(`/api/products/${sampleProduct.pid}`)
        .expect(404);
    });

    it("should return 404 if deleting nonexistent product", async () => {
      const res = await request(app)
        .delete("/api/products/NONEXISTENT_PID")
        .expect(404);

      expect(res.body.message).toContain("not found");
    });
  });

  // ==================== 6. HEALTH CHECK ====================
  describe("GET /health", () => {
    it("should return health status with status OK and database connected", async () => {
      const res = await request(app).get("/health").expect(200);

      expect(res.body.status).toBe("OK");
      expect(res.body.service).toBe("product-api");
      expect(res.body.database).toBe("connected");
      expect(res.body).toHaveProperty("uptime");
      expect(res.body).toHaveProperty("timestamp");
    });
  });
});
