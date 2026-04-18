// ================================================================
// FRONTEND: Hiển thị và quản lý Facebook Ads
// ================================================================

(function() {
    'use strict';

    // ========== CONFIG ==========
    const ADS_CONFIG = {
        syncEndpoint: '/api/ads-sync',
        firebaseRef: 'ads/campaigns',
        syncInterval: 3600000, // 1 hour
        syncTimeKey: 'ads_last_sync_time'
    };

    // ========== STATE ==========
    let db = null;
    let campaigns = [];
    let syncTimer = null;

    // ========== UI SELECTORS ==========
    const ui = {
        container: document.getElementById('ads-container'),
        table: document.getElementById('ads-table'),
        tbody: document.getElementById('ads-tbody'),
        syncBtn: document.getElementById('adsSyncBtn'),
        syncStatus: document.getElementById('adsSyncStatus'),
        statsTotalSpend: document.getElementById('statsTotalSpend'),
        statsImpressions: document.getElementById('statsImpressions'),
        statsClicks: document.getElementById('statsClicks'),
        statsCpc: document.getElementById('statsCpc'),
        lastSyncTime: document.getElementById('lastSyncTime')
    };

    // ========== INITIALIZATION ==========
    function init() {
        if (typeof firebase === 'undefined') return;

        try {
            const config = window.MA_FIREBASE_CONFIG;
            firebase.initializeApp(config);
            db = firebase.database();
            
            setupEventListeners();
            subscribeToRealtime();
            autoSync();
        } catch (err) {
            console.error('Ads Manager init error:', err);
        }
    }

    // ========== EVENT LISTENERS ==========
    function setupEventListeners() {
        if (ui.syncBtn) {
            ui.syncBtn.addEventListener('click', syncNow);
        }

        // Keyboard shortcut: Ctrl+Shift+A để đồng bộ
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                syncNow();
            }
        });
    }

    // ========== REALTIME SYNC ==========
    function subscribeToRealtime() {
        if (!db) return;

        db.ref(ADS_CONFIG.firebaseRef).on('value', function(snapshot) {
            campaigns = snapshot.val() || [];
            renderTable();
            updateStats();
        });
    }

    function autoSync() {
        // Sync ngay khi load
        const lastSync = localStorage.getItem(ADS_CONFIG.syncTimeKey);
        const now = Date.now();
        
        if (!lastSync || (now - parseInt(lastSync)) > ADS_CONFIG.syncInterval) {
            syncNow(true); // silent mode
        }

        // Setup interval sync
        syncTimer = setInterval(() => {
            syncNow(true); // silent mode
        }, ADS_CONFIG.syncInterval);
    }

    // ========== SYNC FROM API ==========
    async function syncNow(silent = false) {
        if (!ui.syncBtn) return;

        try {
            if (!silent) {
                ui.syncBtn.disabled = true;
                setStatus('⏳ Đang đồng bộ...', 'info');
            }

            const response = await fetch(ADS_CONFIG.syncEndpoint, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                localStorage.setItem(ADS_CONFIG.syncTimeKey, Date.now().toString());
                if (!silent) {
                    setStatus(`✅ ${result.message}`, 'success');
                }
                updateLastSyncTime();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Sync error:', error);
            setStatus(`❌ Lỗi: ${error.message}`, 'error');
        } finally {
            if (!silent && ui.syncBtn) {
                ui.syncBtn.disabled = false;
            }
        }
    }

    // ========== RENDERING ==========
    function renderTable() {
        if (!ui.tbody) return;

        ui.tbody.innerHTML = '';

        if (campaigns.length === 0) {
            ui.tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 20px; color: #999;">
                        Chưa có campaign. Hãy đồng bộ lần đầu.
                    </td>
                </tr>
            `;
            return;
        }

        campaigns.forEach(campaign => {
            const row = document.createElement('tr');
            const statusClass = campaign.status === 'ACTIVE' ? 'status-active' : 'status-inactive';
            const statusText = campaign.status === 'ACTIVE' ? '🟢 Hoạt động' : '🔴 Tạm dừng';

            row.innerHTML = `
                <td>${campaign.name}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>₫${formatNumber(campaign.spend)}</td>
                <td>${formatNumber(campaign.impressions)}</td>
                <td>${formatNumber(campaign.clicks)}</td>
                <td>${campaign.ctr}%</td>
                <td>₫${campaign.cpc}</td>
                <td>${campaign.conversions || 0}</td>
                <td>${new Date(campaign.created_time).toLocaleDateString('vi-VN')}</td>
            `;
            ui.tbody.appendChild(row);
        });
    }

    function updateStats() {
        if (campaigns.length === 0) return;

        const totalSpend = campaigns.reduce((sum, c) => sum + parseFloat(c.spend || 0), 0);
        const totalImpressions = campaigns.reduce((sum, c) => sum + parseInt(c.impressions || 0), 0);
        const totalClicks = campaigns.reduce((sum, c) => sum + parseInt(c.clicks || 0), 0);
        const totalConversions = campaigns.reduce((sum, c) => sum + parseInt(c.conversions || 0), 0);
        const avgCpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : 0;

        if (ui.statsTotalSpend) ui.statsTotalSpend.textContent = `₫${formatNumber(totalSpend)}`;
        if (ui.statsImpressions) ui.statsImpressions.textContent = formatNumber(totalImpressions);
        if (ui.statsClicks) ui.statsClicks.textContent = formatNumber(totalClicks);
        if (ui.statsCpc) ui.statsCpc.textContent = `₫${avgCpc}`;
    }

    function updateLastSyncTime() {
        if (ui.lastSyncTime) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('vi-VN');
            ui.lastSyncTime.textContent = `Cập nhật lần cuối: ${timeStr}`;
        }
    }

    // ========== HELPERS ==========
    function formatNumber(num) {
        const n = parseInt(num || 0);
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toString();
    }

    function setStatus(message, type = 'info') {
        if (!ui.syncStatus) return;

        ui.syncStatus.textContent = message;
        ui.syncStatus.className = `ads-status ads-status-${type}`;
        ui.syncStatus.style.display = 'block';

        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                ui.syncStatus.style.display = 'none';
            }, 5000);
        }
    }

    // ========== CLEANUP ==========
    window.addEventListener('beforeunload', () => {
        if (syncTimer) clearInterval(syncTimer);
        if (db) db.ref(ADS_CONFIG.firebaseRef).off();
    });

    // ========== START ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for debugging
    window.AdsManager = {
        sync: syncNow,
        campaigns: () => campaigns,
        reload: subscribeToRealtime
    };
})();
