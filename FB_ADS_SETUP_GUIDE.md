# Hướng Dẫn Setup Facebook Ads Integration

## 📋 Danh Sách Công Việc

- [ ] Lấy credentials từ Facebook Developers
- [ ] Set environment variables trên Vercel
- [ ] Cấu hình Firebase Realtime Database Rules
- [ ] Deploy và test

---

## 1️⃣ Lấy Facebook Credentials

### Bước 1: Tạo Facebook App (nếu chưa có)

1. Vào https://developers.facebook.com/apps
2. Click **"Create App"**
3. Chọn **Business** → Điền thông tin → **Create App**
4. Setup Marketing API (tìm "Marketing API" → "Set Up")

### Bước 2: Lấy App ID & App Secret

1. Vào **Settings** → **Basic**
2. Copy **App ID** (VD: 123456789012345)
3. Copy **App Secret** (VD: abc123def456...)

### Bước 3: Lấy Access Token

#### Cách 1: Dùng Graph API Explorer (đơn giản)
1. Vào https://developers.facebook.com/tools/explorer
2. Chọn app của bạn
3. Chọn **Get User Access Token** → chấp nhận quyền cần thiết
4. Copy token

#### Cách 2: Tạo Long-Lived Token (khuyên dùng)

Chạy request sau (thay giá trị):

```
GET https://graph.facebook.com/v19.0/oauth/access_token?
  grant_type=fb_exchange_token&
  client_id=YOUR_APP_ID&
  client_secret=YOUR_APP_SECRET&
  fb_exchange_token=SHORT_LIVED_TOKEN
```

Hoặc dùng cURL:

```bash
curl "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN"
```

**Kết quả sẽ có:**
```json
{
  "access_token": "LONG_LIVED_TOKEN_HERE",
  "token_type": "bearer"
}
```

### Bước 4: Lấy Ad Account ID

1. Vào https://business.facebook.com/business-settings
2. Tìm **Ads Manager** → chọn ad account
3. URL sẽ có `act_123456789` → đó là Ad Account ID
4. Hoặc xem ở **Settings** → **Ad Accounts**

---

## 2️⃣ Set Environment Variables trên Vercel

### Bước 1: Vào Vercel Dashboard

1. Truy cập https://vercel.com/dashboard
2. Chọn project **ads**

### Bước 2: Vào Settings

1. Click **Settings** tab
2. Tìm **Environment Variables** (bên trái)

### Bước 3: Thêm Biến

Thêm 3 biến sau (copy-paste giá trị của bạn):

| Variable | Value |
|----------|-------|
| `FB_ACCESS_TOKEN` | `your_long_lived_token` |
| `FB_AD_ACCOUNT_ID` | `act_123456789` |
| `FB_API_VERSION` | `v19.0` |

**Ví dụ:**
```
FB_ACCESS_TOKEN = "EAABsbCS1iHgBAGKfZBZCqhNq4e1ZBY1t0YzQlCG..."
FB_AD_ACCOUNT_ID = "act_147258369"
FB_API_VERSION = "v19.0"
```

### Bước 4: Deploy lại

```bash
vercel --prod
```

---

## 3️⃣ Cấu Hình Firebase Realtime Database

### Bước 1: Vào Firebase Console

1. Truy cập https://console.firebase.google.com/
2. Chọn project **adsnora-87953**
3. Click **Realtime Database** (bên trái)

### Bước 2: Tạo Database (nếu chưa có)

1. Click **Create Database**
2. Location: **asia-southeast1** (hoặc gần nhất)
3. Start mode: **Start in test mode** → Create
4. ⚠️ **Sau này thay đổi Rules để secure**

### Bước 3: Cấu Hình Rules

1. Click tab **Rules**
2. Replace toàn bộ nội dung bằng:

```json
{
  "rules": {
    "ads": {
      "campaigns": {
        ".read": true,
        ".write": "root.child('admins').child(auth.uid).val() === true"
      }
    },
    "admins": {
      ".read": "auth.uid != null",
      ".write": false
    },
    ".read": false,
    ".write": false
  }
}
```

3. Click **Publish**

---

## 4️⃣ Testing & Deployment

### Bước 1: Test Local (Optional)

```bash
# Tạo .env.local
echo "FB_ACCESS_TOKEN=your_token" > .env.local
echo "FB_AD_ACCOUNT_ID=act_123456789" >> .env.local
echo "FB_API_VERSION=v19.0" >> .env.local

# Run Vercel dev
npm run dev
```

Vào http://localhost:3000/content.html → click **Đồng Bộ Ngay**

### Bước 2: Deploy Production

```bash
git add .
git commit -m "feat: add Facebook Ads integration"
git push origin master
vercel --prod
```

### Bước 3: Kiểm Tra Trên Web

1. Truy cập https://your-domain.com/content.html
2. Nhấp **🔄 Đồng Bộ Ngay**
3. Kiểm tra:
   - ✅ Hiển thị campaign data
   - ✅ Stats cards cập nhật
   - ✅ Không báo lỗi console

---

## 🔧 Troubleshooting

### Lỗi: "Missing FB_ACCESS_TOKEN or FB_AD_ACCOUNT_ID"
- ✅ Kiểm tra biến đã thêm vào Vercel chưa
- ✅ Deploy lại sau khi thêm biến

### Lỗi: "Meta API Error: Invalid OAuth access token"
- ✅ Token hết hạn → lấy token mới
- ✅ Token bị revoke → kiểm tra Facebook app settings

### Lỗi: "Ad Account ID không hợp lệ"
- ✅ ID phải có format: `act_123456789`
- ✅ Kiểm tra permissions của app đối với ad account

### Không hiển thị campaign
- ✅ Mở **DevTools** (F12) → **Console** → xem error
- ✅ Kiểm tra Firebase Realtime Database có rule read không
- ✅ Kiểm tra ad account có campaign không

---

## 📞 Hỗ Trợ

Nếu cần debug:
1. Mở DevTools (F12) → Console → xem error message
2. Chạy `AdsManager.campaigns()` để xem data
3. Chạy `AdsManager.sync()` để đồng bộ manual
4. Chạy `AdsManager.reload()` để reload from Firebase
