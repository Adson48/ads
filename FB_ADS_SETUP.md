# Hướng Dẫn Kết Nối Facebook Ads Manager

## 1. Tạo Facebook App

### Bước 1: Vào Facebook Developers
1. Truy cập https://developers.facebook.com
2. Đăng nhập bằng tài khoản Facebook của bạn

### Bước 2: Tạo App Mới
1. Nhấp **"My Apps"** → **"Create App"**
2. Chọn **App Type**: "Business"
3. Điền thông tin:
   - App Name: "ADS Manager" (hoặc tên khác)
   - App Contact Email: email công ty
   - Purpose: "Quản lý quảng cáo"
4. Nhấp **"Create App"**

### Bước 3: Thêm sản phẩm Marketing API
1. Vào dashboard app
2. Tìm **"Add Product"** → tìm **"Marketing API"** → **"Set Up"**

### Bước 4: Lấy Access Token
1. Vào **"Settings"** → **"Basic"**
2. Copy **App ID** (lưu lại)
3. Vào **"Tools"** → **"Access Token Debugger"** hoặc **"Graph API Explorer"**
4. Chọn app → Chọn quyền **"ads_read"**
5. Generate token → Copy **Access Token** (lưu lại - đây là temporary token)

### Bước 5: Tạo Long-Lived Token (Quan trọng)
```
GET https://graph.facebook.com/{API_VERSION}/oauth/access_token?
  grant_type=fb_exchange_token&
  client_id={APP_ID}&
  client_secret={APP_SECRET}&
  fb_exchange_token={SHORT_LIVED_TOKEN}
```
- Thay {APP_ID}, {APP_SECRET} (lấy từ Settings → Basic), {SHORT_LIVED_TOKEN}
- Chạy request này → nhận long-lived token (60 ngày)

### Bước 6: Lấy Ad Account ID
1. Vào **"Settings"** → **"Ad Accounts"**
2. Copy ID của ad account (format: `act_123456789`)

---

## 2. Chuẩn Bị Firebase

### Bước 1: Thêm Secret vào Firebase (Config Thực Tế)
```bash
firebase functions:config:set facebook.app_id="YOUR_APP_ID"
firebase functions:config:set facebook.app_secret="YOUR_APP_SECRET"
firebase functions:config:set facebook.long_lived_token="YOUR_LONG_LIVED_TOKEN"
firebase functions:config:set facebook.ad_account_id="act_YOUR_AD_ACCOUNT_ID"
```

---

## 3. Thông Tin Cần Cung Cấp

Để tôi hoàn thành kết nối, bạn cần cung cấp:

1. **Facebook App ID**: `_______________`
2. **Facebook App Secret**: `_______________`
3. **Long-Lived Access Token**: `_______________`
4. **Ad Account ID** (format: act_123456789): `_______________`

---

## 4. Dữ Liệu Sẽ Đồng Bộ

- Campaign name + status
- Spend (chi phí)
- Impressions (lượt hiển thị)
- Clicks (lượt click)
- CPC (chi phí/click)
- CTR (tỷ lệ click)
- Conversions (chuyển đổi)
- Ngày tạo campaign

---

## 5. Hiển Thị Trên Trang Content

- Dashboard tóm tắt: tổng spend, ROI, campaign hoạt động
- Bảng chi tiết tất cả campaign
- Nút "Đồng bộ ngay" để cập nhật thủ công
- Đồng bộ tự động hàng ngày lúc 9 AM (có thể cấu hình)
