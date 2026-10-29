# Product API — Hỏi đáp thực hành 1

Dự án RESTful API quản lý sản phẩm dùng Node.js, Express, MongoDB, Docker Compose, Jest và GitHub Actions. Tám câu hỏi dưới đây tương ứng với tám mục minh chứng chấm điểm.

## Cần chuẩn bị gì trước khi thực hành?

**Trả lời:** Cài Git, Docker Desktop và Postman; chuẩn bị tài khoản GitHub. Nếu thực hiện bước đẩy image lên Docker Hub, cần thêm tài khoản Docker Hub. Mở PowerShell tại thư mục gốc dự án và kiểm tra:

```powershell
git --version
docker --version
docker compose version
```

API chạy tại `http://localhost:3000`; MongoDB truy cập từ máy host qua `localhost:27018` và từ Docker network qua `nammongodb:27017`. Database chính là `productdb`.

## 1. Làm sao chứng minh `.env` không bị đưa lên GitHub? (1 điểm)

**Trả lời:** `.gitignore` cần chứa `node_modules/`, `.env`, `.env.local` và `coverage/`. Tạo `.env` tại thư mục gốc:

```env
PORT=3000
NODE_ENV=development
MONGO_PORT=27018
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=admin123
MONGO_URI=mongodb://admin:admin123@localhost:27018/productdb?authSource=admin
DOCKERHUB_USERNAME=your-dockerhub-username
```

Thay username và mật khẩu ví dụ bằng giá trị của bạn. Kiểm tra bằng:

```powershell
git check-ignore -v .env
git ls-files .env
```

Lệnh đầu phải hiện quy tắc trong `.gitignore`; lệnh sau không được hiện `.env`. Trên GitHub, repository cần có `.gitignore` và không có `.env`. Nếu `.env` từng được commit, dùng `git rm --cached .env` rồi commit để ngừng theo dõi file local.

## 2. Khởi chạy API và MongoDB bằng Docker Compose thế nào? (1 điểm)

**Trả lời:** Sau khi cập nhật mã nguồn và xử lý các thay đổi local chưa commit, chạy:

```powershell
git switch main
git pull origin main
docker compose config
docker compose up -d --build
```

`docker compose config` cần hoàn tất không báo lỗi. Compose tạo network và volume, khởi chạy `nammongodb`, chờ MongoDB healthy rồi khởi chạy `product-api`.

## 3. Kiểm tra sức khỏe hệ thống ra sao? (1 điểm)

**Trả lời:** Gửi `GET http://localhost:3000/health` bằng Postman hoặc chạy:

```powershell
curl.exe -i http://localhost:3000/health
docker inspect --format "{{.State.Health.Status}}" nammongodb
docker inspect --format "{{.State.Health.Status}}" product-api
```

API cần trả HTTP `200 OK`, `database: "connected"` và `dbReadyState: 1`. Hai container cần trả trạng thái `healthy`; có thể cần chờ thêm ít giây sau khi khởi động.

## 4. Xem danh sách container ở đâu? (1 điểm)

**Trả lời:** Chạy `docker compose ps` hoặc `docker ps`. Cần thấy `nammongodb` (cổng host `27018` đến cổng container `27017`) và `product-api` (cổng `3000`), cả hai đều đang chạy và healthy.

## 5. Thêm sản phẩm bằng Postman thế nào? (1 điểm)

**Trả lời:** Gửi `POST http://localhost:3000/api/products`, đặt header `Content-Type: application/json` và chọn **Body → raw → JSON**:

```json
{
  "pid": "P001",
  "pname": "Laptop Dell XPS 15",
  "price": 1500,
  "quantity": 10
}
```

Kết quả mong đợi là HTTP `201 Created`; response có `_id`, `pid`, `pname`, `price`, `quantity`, `createdAt` và `updatedAt`. Dùng `GET http://localhost:3000/api/products` để xem danh sách. Nếu `P001` đã tồn tại, đổi sang một `pid` chưa dùng.

## 6. Xác nhận sản phẩm đã lưu trong MongoDB thế nào? (1 điểm)

**Trả lời:** Mở Mongo Shell trong container:

```powershell
docker exec -it nammongodb mongosh -u admin -p admin123 --authenticationDatabase admin productdb
```

Sau đó chạy `db.products.find()` và tìm sản phẩm vừa thêm, chẳng hạn `pid: "P001"`. Gõ `exit` để thoát. Nếu đã đổi thông tin đăng nhập trong `.env`, dùng giá trị tương ứng.

## 7. Xem log của API thế nào? (1 điểm)

**Trả lời:** Chạy `docker logs product-api` để xem log hiện có, hoặc `docker logs --tail 100 -f product-api` để theo dõi. Log khởi động cần cho thấy MongoDB đã kết nối, server chạy ở cổng 3000 và endpoint `/health` sẵn sàng. Nhấn `Ctrl+C` để ngừng theo dõi.

## 8. Chạy test và kiểm tra CI/CD thế nào? (1 điểm)

**Trả lời:** Khi `nammongodb` đang chạy, cài dependency và chạy integration test với database test riêng:

```powershell
npm ci
$env:NODE_ENV = "test"
$env:MONGO_URI = "mongodb://admin:admin123@localhost:27018/productdb_test?authSource=admin"
npm test
Remove-Item Env:NODE_ENV
Remove-Item Env:MONGO_URI
```

Kết quả mong đợi: `1` test suite và `14` test đều pass. Các test bao phủ tạo, đọc, sửa, xóa sản phẩm và health check.

Workflow `.github/workflows/test-productci-prod.yml` chạy khi push hoặc tạo pull request vào `main`: cài dependency, chạy test với MongoDB, build Docker image và kiểm tra `/health`. Job `cd-dockerhub` chạy sau CI trên nhánh `main` để đẩy image lên Docker Hub. Cần cấu hình hai GitHub Actions secrets: `DOCKERHUB_USERNAME` và `DOCKERHUB_TOKEN`. Mở tab **Actions** của repository để xem kết quả pipeline.

## Dừng hệ thống thế nào?

**Trả lời:** Chạy `docker compose down` để dừng và xóa container/network nhưng giữ volume dữ liệu MongoDB. Chỉ dùng `docker compose down -v` khi muốn xóa luôn volume và toàn bộ dữ liệu trong đó.


12