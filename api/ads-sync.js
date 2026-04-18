// ================================================================
// VERCEL FUNCTION: Đồng bộ dữ liệu từ Facebook Ads Manager
// ================================================================
// Cách cấu hình:
// 1. Vào https://vercel.com/dashboard
// 2. Chọn project → Settings → Environment Variables
// 3. Thêm các biến sau:
//    - FB_ACCESS_TOKEN = "your_long_lived_token"
//    - FB_AD_ACCOUNT_ID = "act_123456789"
//    - FB_API_VERSION = "v19.0"
// 4. Deploy lại
// ================================================================

const admin = require('firebase-admin');

// Nếu chạy local dev, cần serviceAccount.json
// Production sử dụng Vercel + Firebase Admin SDK
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            projectId: 'adsnora-87953',
            databaseURL: 'https://adsnora-87953.firebaseio.com'
        });
    } catch (err) {
        console.log('Firebase already initialized:', err.message);
    }
}

const db = admin.database();

/**
 * Gọi Meta Ads API để lấy danh sách campaign
 */
async function fetchFBCampaigns() {
    const token = process.env.FB_ACCESS_TOKEN;
    const adAccountId = process.env.FB_AD_ACCOUNT_ID;
    const apiVersion = process.env.FB_API_VERSION || 'v19.0';

    if (!token || !adAccountId) {
        throw new Error('Missing FB_ACCESS_TOKEN or FB_AD_ACCOUNT_ID in environment variables');
    }

    const url = `https://graph.facebook.com/${apiVersion}/${adAccountId}/campaigns?access_token=${token}&fields=id,name,status,spend,impressions,clicks,actions,created_time`;

    const response = await fetch(url);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Meta API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
}

/**
 * Tính toán chỉ số: CPC, CTR, Conversions
 */
function calculateMetrics(campaign) {
    const impressions = parseInt(campaign.impressions || 0);
    const clicks = parseInt(campaign.clicks || 0);
    const spend = parseFloat(campaign.spend || 0);

    const cpc = clicks > 0 ? (spend / clicks).toFixed(2) : 0;
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0;

    // Actions array từ Meta (có thể có nhiều action types)
    const conversions = campaign.actions
        ? campaign.actions.reduce((sum, action) => sum + (action.value || 0), 0)
        : 0;

    return { cpc, ctr, conversions };
}

/**
 * Lưu campaigns vào Firebase Realtime DB
 */
async function saveCampaignsToFirebase(campaigns) {
    const processed = campaigns.map(campaign => {
        const metrics = calculateMetrics(campaign);
        return {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            spend: campaign.spend,
            impressions: campaign.impressions,
            clicks: campaign.clicks,
            cpc: metrics.cpc,
            ctr: metrics.ctr,
            conversions: metrics.conversions,
            created_time: campaign.created_time,
            synced_at: new Date().toISOString()
        };
    });

    await db.ref('ads/campaigns').set(processed);
    return processed;
}

/**
 * Main handler
 */
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('🔄 Fetching campaigns from Meta Ads API...');
        const campaigns = await fetchFBCampaigns();

        console.log(`✅ Fetched ${campaigns.length} campaigns`);
        const processed = await saveCampaignsToFirebase(campaigns);

        console.log('💾 Saved to Firebase');
        res.status(200).json({
            success: true,
            message: `Đồng bộ ${campaigns.length} campaign thành công`,
            data: processed,
            synced_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Lỗi đồng bộ quảng cáo. Kiểm tra token và ad account ID'
        });
    }
};
