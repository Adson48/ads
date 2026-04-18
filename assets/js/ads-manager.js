// ================================================================
// FRONTEND: Hiển thị và quản lý Facebook Ads
// ================================================================

(function() {
    'use strict';

    // ========== CONFIG ==========
    var ADS_CONFIG = {
        syncEndpoint: '/api/ads-sync',
        firebaseCollection: 'ads_campaigns',
        syncInterval: 3600000, // 1 giờ
        syncTimeKey: 'ads_last_sync_time'
    };

    // ========== STATE ==========
    var db = null;
    var campaigns = [];
    var syncTimer = null;
    var unsubscribe = null;

    // ========== UI ELEMENTS ==========
    var syncBtn = null;
    var syncStatus = null;

    // ========== INIT ==========
    function init() {
        syncBtn = document.getElementById('adsSyncBtn');
        syncStatus = document.getElementById('adsSyncStatus');

        if (syncBtn) {
            syncBtn.addEventListener('click', function() { syncNow(false); });
        }

        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'A') { syncNow(false); }
        });

        // Khởi tạo Firebase client SDK (dùng Firestore)
        try {
            if (typeof firebase !== 'undefined') {
                if (!firebase.apps.length) {
                    firebase.initializeApp(window.MA_FIREBASE_CONFIG);
                }
                db = firebase.firestore();
                subscribeRealtime();
                scheduleAutoSync();
            }
        } catch (e) {
            console.error('Firebase init error:', e);
        }
    }

    // ========== FIRESTORE REALTIME ==========
    function subscribeRealtime() {
        if (!db) return;
        if (unsubscribe) unsubscribe();

        unsubscribe = db.collection(ADS_CONFIG.firebaseCollection)
            .orderBy('synced_at', 'desc')
            .onSnapshot(function(snapshot) {
                campaigns = [];
                snapshot.forEach(function(doc) {
                    campaigns.push(doc.data());
                });
                renderTable();
                updateStats();
            }, function(err) {
                console.error('Firestore error:', err);
            });
    }

    // ========== AUTO SYNC ==========
    function scheduleAutoSync() {
        var lastSync = localStorage.getItem(ADS_CONFIG.syncTimeKey);
        var now = Date.now();
        if (!lastSync || (now - parseInt(lastSync)) > ADS_CONFIG.syncInterval) {
            syncNow(true);
        }
        if (syncTimer) clearInterval(syncTimer);
        syncTimer = setInterval(function() { syncNow(true); }, ADS_CONFIG.syncInterval);
    }

    // ========== SYNC FROM VERCEL API → SAVE TO FIRESTORE ==========
    async function syncNow(silent) {
        if (!silent) {
            if (syncBtn) syncBtn.disabled = true;
            setStatus('⏳ Đang đồng bộ từ Facebook...', 'info');
        }

        try {
            var response = await fetch(ADS_CONFIG.syncEndpoint);
            if (!response.ok) throw new Error('HTTP ' + response.status);

            var result = await response.json();

            if (!result.success) {
                throw new Error(result.error || result.message || 'Lỗi API');
            }

            // Lưu từng campaign vào Firestore
            if (db && result.data && result.data.length > 0) {
                var batch = db.batch();
                result.data.forEach(function(c) {
                    var ref = db.collection(ADS_CONFIG.firebaseCollection).doc(c.id);
                    batch.set(ref, c);
                });
                await batch.commit();
            }

            localStorage.setItem(ADS_CONFIG.syncTimeKey, Date.now().toString());
            updateLastSyncTime();

            if (!silent) {
                setStatus('✅ ' + result.message, 'success');
            }

        } catch (err) {
            console.error('Sync error:', err);
            if (!silent) {
                setStatus('❌ Lỗi: ' + err.message, 'error');
            }
        } finally {
            if (!silent && syncBtn) syncBtn.disabled = false;
        }
    }

    // ========== RENDER TABLE ==========
    function renderTable() {
        var tbody = document.getElementById('ads-tbody');
        if (!tbody) return;

        if (!campaigns || campaigns.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#999;">Chưa có dữ liệu. Nhấn "Đồng Bộ Ngay" để tải.</td></tr>';
            return;
        }

        tbody.innerHTML = campaigns.map(function(c) {
            var statusClass = c.status === 'ACTIVE' ? 'status-active' : 'status-inactive';
            var statusText = c.status === 'ACTIVE' ? '🟢 Hoạt động' : '🔴 Tạm dừng';
            var createdDate = c.created_time ? new Date(c.created_time).toLocaleDateString('vi-VN') : '—';
            return '<tr>' +
                '<td>' + escHtml(c.name || '—') + '</td>' +
                '<td><span class="' + statusClass + '">' + statusText + '</span></td>' +
                '<td>₫' + formatNum(c.spend) + '</td>' +
                '<td>' + formatNum(c.impressions) + '</td>' +
                '<td>' + formatNum(c.clicks) + '</td>' +
                '<td>' + (c.ctr || 0) + '%</td>' +
                '<td>₫' + (c.cpc || 0) + '</td>' +
                '<td>' + (c.conversions || 0) + '</td>' +
                '<td>' + createdDate + '</td>' +
                '</tr>';
        }).join('');
    }

    // ========== UPDATE STATS ==========
    function updateStats() {
        var totalSpend = campaigns.reduce(function(s, c) { return s + parseFloat(c.spend || 0); }, 0);
        var totalImpressions = campaigns.reduce(function(s, c) { return s + parseInt(c.impressions || 0); }, 0);
        var totalClicks = campaigns.reduce(function(s, c) { return s + parseInt(c.clicks || 0); }, 0);
        var avgCpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '0';

        var el = function(id) { return document.getElementById(id); };
        if (el('statsTotalSpend')) el('statsTotalSpend').textContent = '₫' + formatNum(totalSpend);
        if (el('statsImpressions')) el('statsImpressions').textContent = formatNum(totalImpressions);
        if (el('statsClicks')) el('statsClicks').textContent = formatNum(totalClicks);
        if (el('statsCpc')) el('statsCpc').textContent = '₫' + avgCpc;
    }

    function updateLastSyncTime() {
        var el = document.getElementById('lastSyncTime');
        if (el) el.textContent = 'Cập nhật lần cuối: ' + new Date().toLocaleTimeString('vi-VN');
    }

    // ========== HELPERS ==========
    function formatNum(n) {
        n = parseFloat(n || 0);
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return Math.round(n).toString();
    }

    function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function setStatus(msg, type) {
        if (!syncStatus) return;
        syncStatus.textContent = msg;
        syncStatus.className = 'ads-status ads-status-' + (type || 'info');
        syncStatus.style.display = 'block';
        if (type === 'success' || type === 'error') {
            setTimeout(function() { syncStatus.style.display = 'none'; }, 5000);
        }
    }

    // ========== CLEANUP ==========
    window.addEventListener('beforeunload', function() {
        if (syncTimer) clearInterval(syncTimer);
        if (unsubscribe) unsubscribe();
    });

    // ========== START ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Debug helper
    window.AdsManager = { sync: function() { syncNow(false); }, campaigns: function() { return campaigns; } };
})();

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
