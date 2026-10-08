# 📦 Product CRUD RESTful API với Docker, Mongoose & CI/CD Pipeline

Dự án xây dựng ứng dụng RESTful API hoàn chỉnh quản lý **Product** theo mô hình CRUD, kết nối cơ sở dữ liệu **MongoDB** qua **Mongoose**, đóng gói ứng dụng bằng **Docker & Docker Compose**, thiết lập **Healthcheck**, xây dựng **CI/CD Pipeline với GitHub Actions & Docker Hub**, và tự động hóa triển khai về **Local Docker Engine**.

---

## 📑 Mục lục
1. [Cấu trúc thư mục dự án](#1-cấu-trúc-thư-mục-dự-án)
2. [Tạo container MongoDB cơ bản trên Docker Engine (nammongodb)](#2-tạo-container-mongodb-cơ-bản-trên-docker-engine-nammongodb)
3. [Bước 6: Ứng dụng RESTful API CRUD cho Product](#3-bước-6-ứng-dụng-restful-api-crud-cho-product)
4. [Bước 7: Dockerize cho Product API (Dockerfile)](#4-bước-7-dockerize-cho-product-api-dockerfile)
5. [Bước 8: Sử dụng Docker Compose](#5-bước-8-sử-dụng-docker-compose)
6. [Bước 9: Healthcheck cho MongoDB + Product API](#6-bước-9-healthcheck-cho-mongodb--product-api)
7. [Bước 10 & 11: CI Pipeline (test-productci-prod.yml)](#7-bước-10--11-ci-pipeline-test-productci-prodyml)
8. [Bước 12: CD với Docker Hub & Healthcheck](#8-bước-12-cd-với-docker-hub--healthcheck)
9. [Bước 13: Chạy image từ Docker Hub trên Local (docker-compose-prod.yaml)](#9-bước-13-chạy-image-từ-docker-hub-trên-local-docker-compose-prodyaml)
10. [Bước 14: Triển khai thủ công về Local](#10-bước-14-triển-khai-thủ-công-về-local)
11. [Hướng dẫn kiểm thử API (Postman / cURL / PowerShell)](#11-hướng-dẫn-kiểm-thử-api)

---

## 1. Cấu trúc thư mục dự án

```
product-api-k/
├── .github/
│   └── workflows/
│       └── test-productci-prod.yml  # CI/CD: CRUD test, build và push Docker Hub
├── config/
│   └── db.js                        # Kết nối MongoDB qua Mongoose
├── controllers/
│   └── productController.js         # Xử lý logic nghiệp vụ CRUD (pid, pname, price, quantity)
├── models/
│   └── Product.js                   # Mongoose Schema & Model cho Product
├── routes/
│   └── productRoutes.js             # Định tuyến API /api/products
├── tests/
│   ├── simple.test.js               # Unit test cho Bước 10
│   └── product.test.js              # Integration test toàn diện (14 test cases) cho Bước 11
├── .dockerignore                    # Danh sách file bỏ qua khi build Docker image
├── .env                             # Biến môi trường kết nối từ VS Code đến Docker
├── .env.example                     # Mẫu biến môi trường
├── .gitignore                       # Danh sách file bỏ qua trong Git
├── deploy-local.ps1                 # Script tự động hóa triển khai CD trên Windows PowerShell
├── deploy-local.sh                  # Script tự động hóa triển khai CD trên Linux/macOS
├── Dockerfile                       # Multi-stage Dockerfile chuẩn production có HEALTHCHECK
├── docker-compose.yml               # Docker Compose phát triển môi trường local
├── docker-compose-prod.yaml         # Docker Compose môi trường production kéo từ Docker Hub + Watchtower
├── package.json                     # Thông tin gói và câu lệnh npm scripts
└── server.js                        # Điểm khởi chạy ứng dụng Express với endpoint /health
```

---

## 2. Tạo container MongoDB cơ bản trên Docker Engine (nammongodb)

Để khởi tạo container MongoDB độc lập với tên `nammongodb` trên Docker Engine:

```powershell
docker run -d `
  --name nammongodb `
  -p 27018:27017 `
  -e MONGO_INITDB_ROOT_USERNAME=admin `
  -e MONGO_INITDB_ROOT_PASSWORD=admin123 `
  -v mongodb_data:/data/db `
  mongo:7
```

> **Ghi chú**: Container đã được ánh xạ cổng `27018:27017` trên host để tránh xung đột cổng `27017` nếu máy đã cài dịch vụ MongoDB cục bộ. Nếu muốn ánh xạ `27017:27017`, bạn chỉ cần đổi tham số `-p 27017:27017`.

Kiểm tra trạng thái container:
```powershell
docker ps --filter "name=nammongodb"
```

---

## 3. Bước 6: Ứng dụng RESTful API CRUD cho Product

Mỗi sản phẩm có 4 trường thông tin bắt buộc:
- `pid` (String, duy nhất, bắt buộc)
- `pname` (String, bắt buộc)
- `price` (Number, >= 0, bắt buộc)
- `quantity` (Number, >= 0, mặc định: 0, bắt buộc)

### Cấu hình biến môi trường (`.env`):
Tạo file `.env` tại thư mục gốc của dự án:
```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://admin:admin123@localhost:27018/productdb?authSource=admin
DOCKERHUB_USERNAME=your-dockerhub-username
```

### Chạy ứng dụng từ VS Code kết nối tới container nammongodb:
```powershell
# Cài đặt thư viện phụ thuộc
npm install

# Khởi chạy chế độ phát triển (auto-reload với nodemon)
npm run dev

# Hoặc khởi chạy thông thường:
npm start
```

---

## 4. Bước 7: Dockerize cho Product API (Dockerfile)

File `Dockerfile` được tối ưu hóa theo mô hình **Multi-Stage Build**:
- **Stage 1 (Builder)**: Sử dụng `node:20-alpine`, chỉ cài đặt dependencies production (`npm ci --omit=dev`).
- **Stage 2 (Production)**: Chạy dưới quyền người dùng an toàn không phải root (`appuser`), thiết lập chỉ thị `HEALTHCHECK`.

```dockerfile
# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Production Runtime
FROM node:20-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

### Lệnh build thử Docker image:
```powershell
docker build -t product-api:latest .
```

---

## 5. Bước 8: Sử dụng Docker Compose

File `docker-compose.yml` kết nối container `product-api` và `nammongodb` trong cùng một mạng nội bộ `product-network`. 

Khởi chạy cả stack bằng một lệnh duy nhất:
```powershell
docker compose up -d
```

Dừng và dọn dẹp:
```powershell
docker compose down
```

---

## 6. Bước 9: Healthcheck cho MongoDB + Product API

### Endpoint Healthcheck (`GET /health`):
Trong `server.js`, endpoint `/health` kiểm tra kết nối cơ sở dữ liệu thời gian thực:
- Trả về HTTP `200 OK` khi MongoDB đã kết nối (`readyState === 1`).
- Trả về HTTP `503 Service Unavailable` khi mất kết nối.

Ví dụ phản hồi JSON:
```json
{
  "status": "OK",
  "service": "product-api",
  "database": "connected",
  "dbReadyState": 1,
  "uptime": 45.12,
  "timestamp": "2026-10-01T16:08:04.018Z"
}
```

### Healthcheck trong Docker Compose:
- **MongoDB**: Dùng lệnh `mongosh` ping:
  ```yaml
  healthcheck:
    test: ["CMD-SHELL", "mongosh --quiet --eval 'try { db.adminCommand(\"ping\"); print(\"healthy\"); } catch(e) { quit(1); }'"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 20s
  ```
- **Product API**: Dùng `wget` gọi endpoint `/health`:
  ```yaml
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
    interval: 15s
    timeout: 5s
    retries: 3
    start_period: 10s
  ```
- **Điều kiện phụ thuộc**:
  `product-api` chỉ bắt đầu khởi động khi `nammongodb` đã ở trạng thái **healthy** thông qua:
  ```yaml
  depends_on:
    nammongodb:
      condition: service_healthy
  ```

---

## 7. Bước 10 & 11: CI Pipeline (`test-productci-prod.yml`)

Đường dẫn: `.github/workflows/test-productci-prod.yml`

Đây là workflow CI/CD duy nhất của dự án:
1. **GitHub Actions Service Container**: Khởi tạo container `mongo:7` trực tiếp trên máy ảo Ubuntu với healthcheck.
2. **Integration CRUD Tests**: Thực thi Jest + Supertest (`npm test`) trên MongoDB thật với 14 kịch bản kiểm thử.
3. **Docker Healthcheck**: Build image và kiểm tra endpoint `/health` trong stack container cô lập.
4. **CD**: Sau khi CI thành công trên nhánh `main`, build và push image lên Docker Hub. Việc triển khai về máy local được thực hiện thủ công.

---

## 8. Bước 12: CD với Docker Hub & Healthcheck

Tích hợp trong job `cd-dockerhub` của `test-productci-prod.yml`:
- Chỉ kích hoạt khi:
  - Nhánh `main` được cập nhật.
  - Toàn bộ bước **CI Tests và Healthcheck ở Bước 11 đều vượt qua (100% PASS)**.
- Đăng nhập Docker Hub bằng GitHub Secrets:
  - `DOCKERHUB_USERNAME`: Tài khoản Docker Hub
  - `DOCKERHUB_TOKEN`: Personal Access Token từ Docker Hub
- Build và Push đa tag:
  - `<username>/product-api:latest`
  - `<username>/product-api:<commit-sha>`

### Cách cấu hình GitHub Secrets:
1. Vào repository GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. Chọn **New repository secret**:
   - `DOCKERHUB_USERNAME`: Tên đăng nhập Docker Hub của bạn.
   - `DOCKERHUB_TOKEN`: Access Token tạo tại [Docker Hub Security Settings](https://hub.docker.com/settings/security).

---

## 9. Bước 13: Chạy image từ Docker Hub trên Local (`docker-compose-prod.yaml`)

File `docker-compose-prod.yaml` sử dụng image đã được đẩy lên Docker Hub:

```yaml
services:
  nammongodb:
    image: mongo:7
    container_name: nammongodb-prod
    restart: always
    ports:
      - "${MONGO_PORT:-27018}:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_INITDB_ROOT_USERNAME:-admin}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_INITDB_ROOT_PASSWORD:-admin123}
    volumes:
      - mongodb_prod_data:/data/db

  product-api:
    image: ${DOCKERHUB_USERNAME:-your-dockerhub-username}/product-api:latest
    container_name: product-api-prod
    restart: always
    ports:
      - "${PORT:-3000}:3000"
    environment:
      PORT: 3000
      MONGO_URI: mongodb://${MONGO_INITDB_ROOT_USERNAME:-admin}:${MONGO_INITDB_ROOT_PASSWORD:-admin123}@nammongodb:27017/productdb?authSource=admin
      NODE_ENV: production
    depends_on:
      nammongodb:
        condition: service_healthy
```

Lệnh chạy thủ công:
```powershell
docker compose -f docker-compose-prod.yaml pull
docker compose -f docker-compose-prod.yaml up -d
```

---

## 10. Bước 14: Triển khai thủ công về Local

GitHub Actions kết thúc sau khi build và push image lên Docker Hub. Khi muốn triển khai phiên bản mới về máy local, chạy:

```powershell
docker compose -f docker-compose-prod.yaml pull
docker compose -f docker-compose-prod.yaml up -d --remove-orphans
```

Hoặc dùng script có sẵn:

- **Windows**: `\.\deploy-local.ps1`
- **Linux / macOS**: `./deploy-local.sh`

### Tùy chọn: Tự động cập nhật bằng Watchtower

Trong `docker-compose-prod.yaml` đã tích hợp sẵn dịch vụ **Watchtower**:
```yaml
  watchtower:
    image: containrrr/watchtower:latest
    container_name: product-api-watchtower
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 30 --cleanup product-api-prod
    environment:
      WATCHTOWER_POLL_INTERVAL: 30
      WATCHTOWER_CLEANUP: "true"
      WATCHTOWER_INCLUDE_RESTARTING: "true"
```
- **Cơ chế hoạt động**: Watchtower chạy ngầm trên Local Docker Engine, định kỳ mỗi 30 giây kiểm tra Docker Hub và tự cập nhật container. Nếu muốn hoàn toàn triển khai thủ công, không khởi chạy service `watchtower`.

---

## 11. Hướng dẫn kiểm thử API

### 1. Kiểm tra trạng thái Healthcheck:
```powershell
curl -X GET http://localhost:3000/health
```

### 2. Thêm mới Product (CREATE):
```powershell
curl -X POST http://localhost:3000/api/products `
  -H "Content-Type: application/json" `
  -d '{"pid": "P001", "pname": "Bàn phím cơ không dây", "price": 120.5, "quantity": 15}'
```

### 3. Lấy danh sách tất cả Product (READ ALL):
```powershell
curl -X GET http://localhost:3000/api/products
```

### 4. Lấy chi tiết Product theo pid (READ ONE):
```powershell
curl -X GET http://localhost:3000/api/products/P001
```

### 5. Cập nhật Product theo pid (UPDATE):
```powershell
curl -X PUT http://localhost:3000/api/products/P001 `
  -H "Content-Type: application/json" `
  -d '{"pname": "Bàn phím cơ Custom RGB", "price": 150.0, "quantity": 25}'
```

### 6. Xóa Product theo pid (DELETE):
```powershell
curl -X DELETE http://localhost:3000/api/products/P001
```

### 7. Chạy kiểm thử tự động với Jest:
```powershell
# Chạy Unit test đơn giản (Bước 10)
npm run test:unit

# Chạy trọn bộ Integration CRUD test với MongoDB (Bước 11)
npm test
```
