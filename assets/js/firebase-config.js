// ================================================================
// CẤU HÌNH FIREBASE — Marketing Ads
// ================================================================
// HƯỚNG DẪN THIẾT LẬP (làm 1 lần duy nhất):
//
//  1. Truy cập https://console.firebase.google.com/
//  2. Nhấn "Add project" → đặt tên (vd: marketing-ads) → tạo project
//  3. Sau khi tạo xong, nhấn biểu tượng </> (Web) để thêm Web App
//  4. Đặt tên app → nhấn "Register app"
//  5. Copy các giá trị từ firebaseConfig vào bên dưới
//  6. Quay lại Firebase Console → Build → Firestore Database
//     → "Create database" → chọn "Start in production mode" → chọn region
//  7. Sau khi tạo Firestore xong, vào tab "Rules" → dán rule sau:
//
//     rules_version = '2';
//     service cloud.firestore {
//       match /databases/{database}/documents {
//         match /{document=**} {
//           allow read, write: if true;
//         }
//       }
//     }
//
//  8. Upload file này lên GitHub → tài khoản sẽ đồng bộ mọi thiết bị
// ================================================================

window.MA_FIREBASE_CONFIG = {
    apiKey:            "AIzaSyBW6iwCikzgP4NfA0n3LbP5W73lDOihj4w",
    authDomain:        "adsnora-87953.firebaseapp.com",
    projectId:         "adsnora-87953",
    storageBucket:     "adsnora-87953.firebasestorage.app",
    messagingSenderId: "969010060641",
    appId:             "1:969010060641:web:ff0cdf92103f13caacb920"
};

// ================================================================
// Ví dụ sau khi điền thông tin thật:
//
// window.MA_FIREBASE_CONFIG = {
//     apiKey:            "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
//     authDomain:        "marketing-ads-12345.firebaseapp.com",
//     projectId:         "marketing-ads-12345",
//     storageBucket:     "marketing-ads-12345.appspot.com",
//     messagingSenderId: "123456789012",
//     appId:             "1:123456789012:web:abcdefabcdef"
// };
// ================================================================
