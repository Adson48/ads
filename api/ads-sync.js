// ================================================================
// VERCEL FUNCTION: Proxy gọi Facebook Ads API
// Query params:
//   ?account=act_xxx   - Ad account ID (override env var)
//   ?since=YYYY-MM-DD  - Ngày bắt đầu (mặc định: đầu tháng)
//   ?until=YYYY-MM-DD  - Ngày kết thúc (mặc định: hôm nay)
// ================================================================

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const token = process.env.FB_ACCESS_TOKEN;
    const defaultAcc = process.env.FB_AD_ACCOUNT_ID;
    const apiVersion = process.env.FB_API_VERSION || 'v25.0';

    if (!token || !defaultAcc) {
        return res.status(500).json({
            success: false,
            error: 'Chưa cấu hình FB_ACCESS_TOKEN hoặc FB_AD_ACCOUNT_ID trên Vercel'
        });
    }

    const adAccountId = (req.query && req.query.account) ? req.query.account : defaultAcc;

    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const todayStr = today.toISOString().slice(0, 10);
    const since = (req.query && req.query.since) ? req.query.since : firstOfMonth;
    const until = (req.query && req.query.until) ? req.query.until : todayStr;

    try {
        const fields = [
            'id',
            'name',
            'status',
            'created_time',
            'daily_budget',
            'lifetime_budget',
            `insights.time_range({"since":"${since}","until":"${until}"}){spend,impressions,clicks,cpc,ctr,cpm,actions,reach}`
        ].join(',');

        const url = `https://graph.facebook.com/${apiVersion}/${adAccountId}/campaigns` +
            `?access_token=${token}&fields=${encodeURIComponent(fields)}&limit=100`;

        const fbRes = await fetch(url);
        const fbData = await fbRes.json();

        if (fbData.error) {
            return res.status(400).json({
                success: false,
                error: fbData.error.message || 'Meta API error'
            });
        }

        const campaigns = (fbData.data || []).map(c => {
            const ins = (c.insights && c.insights.data && c.insights.data[0]) || {};
            const conversions = ins.actions
                ? ins.actions
                    .filter(a => a.action_type === 'offsite_conversion.fb_pixel_purchase' || a.action_type === 'lead' || a.action_type === 'contact')
                    .reduce((sum, a) => sum + parseFloat(a.value || 0), 0)
                : 0;
            const allActions = ins.actions
                ? ins.actions.reduce((sum, a) => sum + parseFloat(a.value || 0), 0)
                : 0;
            const budget = c.daily_budget
                ? (parseFloat(c.daily_budget) / 100) + 'đ/ngày'
                : c.lifetime_budget
                    ? (parseFloat(c.lifetime_budget) / 100) + 'đ trọn đời'
                    : 'Sử dụng ngân sách...';

            return {
                id: c.id,
                name: c.name,
                status: c.status,
                created_time: c.created_time,
                budget: budget,
                spend: parseFloat(ins.spend || 0),
                impressions: parseInt(ins.impressions || 0, 10),
                reach: parseInt(ins.reach || 0, 10),
                clicks: parseInt(ins.clicks || 0, 10),
                cpc: parseFloat(ins.cpc || 0).toFixed(0),
                ctr: parseFloat(ins.ctr || 0).toFixed(2),
                cpm: parseFloat(ins.cpm || 0).toFixed(0),
                conversions: conversions,
                actions: allActions,
                account: adAccountId,
                since: since,
                until: until,
                synced_at: new Date().toISOString()
            };
        });

        return res.status(200).json({
            success: true,
            message: `Lấy được ${campaigns.length} chiến dịch (${since} -> ${until})`,
            data: campaigns,
            account: adAccountId,
            since: since,
            until: until,
            synced_at: new Date().toISOString()
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message || 'Lỗi server'
        });
    }
};
