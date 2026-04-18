// ================================================================
// VERCEL FUNCTION: Proxy gọi Facebook Ads API
// ================================================================
// Cấu hình environment variables trên Vercel Dashboard:
//   Settings → Environment Variables → thêm:
//   - FB_ACCESS_TOKEN = "EAAVDZCoYN0OoB..."
//   - FB_AD_ACCOUNT_ID = "act_724992993672214"
//   - FB_API_VERSION = "v25.0"  (hoặc v19.0)
// ================================================================

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const token = process.env.FB_ACCESS_TOKEN;
    const adAccountId = process.env.FB_AD_ACCOUNT_ID;
    const apiVersion = process.env.FB_API_VERSION || 'v25.0';

    if (!token || !adAccountId) {
        return res.status(500).json({
            success: false,
            error: 'Chưa cấu hình FB_ACCESS_TOKEN hoặc FB_AD_ACCOUNT_ID trên Vercel'
        });
    }

    try {
        // Lấy campaigns + insights (spend, impressions, clicks, cpc, ctr, actions)
        const fields = [
            'id', 'name', 'status', 'created_time',
            'insights{spend,impressions,clicks,cpc,ctr,actions}'
        ].join(',');

        const url = `https://graph.facebook.com/${apiVersion}/${adAccountId}/campaigns` +
            `?access_token=${token}&fields=${fields}&limit=50`;

        const fbRes = await fetch(url);
        const fbData = await fbRes.json();

        if (fbData.error) {
            return res.status(400).json({
                success: false,
                error: fbData.error.message || 'Meta API error'
            });
        }

        // Chuẩn hóa dữ liệu
        const campaigns = (fbData.data || []).map(c => {
            const ins = (c.insights && c.insights.data && c.insights.data[0]) || {};
            const conversions = ins.actions
                ? ins.actions.reduce((sum, a) => sum + parseFloat(a.value || 0), 0)
                : 0;
            return {
                id: c.id,
                name: c.name,
                status: c.status,
                created_time: c.created_time,
                spend: parseFloat(ins.spend || 0),
                impressions: parseInt(ins.impressions || 0),
                clicks: parseInt(ins.clicks || 0),
                cpc: parseFloat(ins.cpc || 0).toFixed(2),
                ctr: parseFloat(ins.ctr || 0).toFixed(2),
                conversions: conversions,
                synced_at: new Date().toISOString()
            };
        });

        res.status(200).json({
            success: true,
            message: `Lấy được ${campaigns.length} campaign`,
            data: campaigns,
            synced_at: new Date().toISOString()
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message || 'Lỗi server không xác định'
        });
    }
};
