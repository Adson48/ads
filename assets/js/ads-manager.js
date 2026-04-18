// ================================================================
// ADS MANAGER — v3 — Account selector, date filter, col resize
// ================================================================
(function () {
    'use strict';

    // ---- CONFIG ----
    var CFG = {
        syncEndpoint: '/api/ads-sync',
        firestoreCollection: 'ads_campaigns',
        accountsKey: 'ads_accounts_v2',
        syncTimeKey: 'ads_last_sync_time',
        syncInterval: 3600000
    };

    // ---- STATE ----
    var db = null;
    var allCampaigns = [];
    var filteredCampaigns = [];
    var accounts = [];          // [{id, name}]
    var currentAccount = '';
    var currentFilter = 'all';
    var currentSort = { col: null, asc: true };
    var searchQuery = '';
    var syncTimer = null;
    var unsubscribe = null;

    // ---- INIT ----
    function init() {
        loadAccounts();
        setDefaultDates();
        renderAccountSelect();
        renderAccountChips();
        setupEvents();
        initFirebase();
    }

    // ---- FIREBASE ----
    function initFirebase() {
        try {
            if (typeof firebase === 'undefined') return;
            if (!firebase.apps.length) firebase.initializeApp(window.MA_FIREBASE_CONFIG);
            db = firebase.firestore();
        } catch (e) { console.error('Firebase init:', e); }
    }

    function subscribeRealtime(accountId, since, until) {
        if (!db) return;
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }

        var query = db.collection(CFG.firestoreCollection)
            .where('account', '==', accountId)
            .where('since', '==', since)
            .where('until', '==', until);

        unsubscribe = query.onSnapshot(function (snap) {
            allCampaigns = [];
            snap.forEach(function (doc) { allCampaigns.push(doc.data()); });
            applyFilterSort();
            updateStats();
        }, function (err) {
            console.warn('Firestore listen error:', err.message);
        });
    }

    // ---- ACCOUNTS ----
    function loadAccounts() {
        try {
            var raw = localStorage.getItem(CFG.accountsKey);
            accounts = raw ? JSON.parse(raw) : [];
        } catch (e) { accounts = []; }
        // Always ensure the default env account exists as fallback hint
        if (accounts.length === 0) {
            accounts = [{ id: 'act_724992993672214', name: 'Tài khoản chính' }];
            saveAccounts();
        }
    }
    function saveAccounts() {
        localStorage.setItem(CFG.accountsKey, JSON.stringify(accounts));
    }
    function renderAccountSelect() {
        var sel = document.getElementById('adsAccountSelect');
        if (!sel) return;
        var cur = sel.value || currentAccount;
        sel.innerHTML = '<option value="">Chọn tài khoản...</option>' +
            accounts.map(function (a) {
                return '<option value="' + esc(a.id) + '"' + (a.id === cur ? ' selected' : '') + '>' + esc(a.name) + ' (' + esc(a.id) + ')</option>';
            }).join('');
    }
    function renderAccountChips() {
        var wrap = document.getElementById('adsAccountChips');
        if (!wrap) return;
        if (accounts.length === 0) {
            wrap.innerHTML = '<span style="color:#9ca3af;font-size:.82rem;">Chưa có tài khoản nào.</span>';
            return;
        }
        wrap.innerHTML = accounts.map(function (a, i) {
            return '<div class="ads-account-chip' + (a.id === currentAccount ? ' active' : '') + '" data-idx="' + i + '">' +
                '<span class="chip-label">' + esc(a.name) + '</span>' +
                '<span style="color:#9ca3af;font-size:.75rem;">(' + esc(a.id) + ')</span>' +
                '<span class="chip-del" data-idx="' + i + '" title="Xóa" style="cursor:pointer;color:#dc2626;margin-left:4px;font-weight:700;">×</span>' +
                '</div>';
        }).join('');
        wrap.querySelectorAll('.chip-del').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var idx = parseInt(this.dataset.idx);
                accounts.splice(idx, 1);
                saveAccounts();
                renderAccountSelect();
                renderAccountChips();
            });
        });
        wrap.querySelectorAll('.ads-account-chip').forEach(function (chip) {
            chip.addEventListener('click', function (e) {
                if (e.target.classList.contains('chip-del')) return;
                var idx = parseInt(this.dataset.idx);
                currentAccount = accounts[idx].id;
                var sel = document.getElementById('adsAccountSelect');
                if (sel) sel.value = currentAccount;
                renderAccountChips();
            });
        });
    }

    // ---- DEFAULT DATES ----
    function setDefaultDates() {
        var today = new Date();
        var firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        var toEl = document.getElementById('adsDateTo');
        var fromEl = document.getElementById('adsDateFrom');
        if (toEl && !toEl.value) toEl.value = fmtDate(today);
        if (fromEl && !fromEl.value) fromEl.value = fmtDate(firstOfMonth);
    }
    function fmtDate(d) {
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        var dd = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + mm + '-' + dd;
    }

    // ---- EVENTS ----
    function setupEvents() {
        var syncBtn = document.getElementById('adsSyncBtn');
        if (syncBtn) syncBtn.addEventListener('click', function () { syncNow(); });

        setupDateQuickFilters();

        var search = document.getElementById('adsSearchInput');
        if (search) search.addEventListener('input', function () {
            searchQuery = this.value.toLowerCase().trim();
            applyFilterSort();
        });

        document.querySelectorAll('.ads-filter-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                document.querySelectorAll('.ads-filter-tab').forEach(function (t) { t.classList.remove('active'); });
                this.classList.add('active');
                currentFilter = this.dataset.filter;
                applyFilterSort();
            });
        });

        document.querySelectorAll('#ads-table th.sortable').forEach(function (th) {
            th.addEventListener('click', function (e) {
                if (e.target.classList.contains('col-resize-handle')) return;
                var col = this.dataset.col;
                document.querySelectorAll('#ads-table th').forEach(function (t) {
                    t.classList.remove('sorted-asc', 'sorted-desc');
                });
                if (currentSort.col === col) {
                    currentSort.asc = !currentSort.asc;
                } else {
                    currentSort.col = col; currentSort.asc = true;
                }
                this.classList.add(currentSort.asc ? 'sorted-asc' : 'sorted-desc');
                applyFilterSort();
            });
        });

        var checkAll = document.getElementById('adsCheckAll');
        if (checkAll) checkAll.addEventListener('change', function () {
            document.querySelectorAll('.ads-row-check').forEach(function (cb) { cb.checked = checkAll.checked; });
        });

        var manageBtn = document.getElementById('adsManageAccountsBtn');
        if (manageBtn) manageBtn.addEventListener('click', function () {
            var panel = document.getElementById('adsAccountPanel');
            if (panel) panel.classList.toggle('open');
        });

        var addBtn = document.getElementById('adsAddAccountBtn');
        if (addBtn) addBtn.addEventListener('click', function () {
            var idEl   = document.getElementById('adsNewAccountId');
            var nameEl = document.getElementById('adsNewAccountName');
            var newId  = (idEl ? idEl.value.trim() : '');
            var newName = (nameEl ? nameEl.value.trim() : '') || newId;
            if (!newId) { alert('Vui lòng nhập Ad Account ID (dạng act_xxx)'); return; }
            if (!newId.startsWith('act_')) newId = 'act_' + newId;
            if (accounts.some(function (a) { return a.id === newId; })) {
                alert('Tài khoản này đã tồn tại'); return;
            }
            accounts.push({ id: newId, name: newName });
            saveAccounts();
            if (idEl)   idEl.value   = '';
            if (nameEl) nameEl.value = '';
            renderAccountSelect();
            renderAccountChips();
        });

        document.addEventListener('keydown', function (e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'A') syncNow();
        });

        // Column resize
        setupColResize();
    }

    function setupDateQuickFilters() {
        var quickBtn = document.getElementById('adsDateQuickBtn');
        var panel = document.getElementById('adsDateQuickPanel');
        if (!quickBtn || !panel) return;

        quickBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            panel.classList.toggle('open');
        });

        panel.querySelectorAll('.ads-date-preset').forEach(function (btn) {
            btn.addEventListener('click', function () {
                applyDatePreset(this.dataset.range);
                panel.classList.remove('open');
            });
        });

        document.addEventListener('click', function (e) {
            if (!panel.classList.contains('open')) return;
            if (!panel.contains(e.target) && e.target !== quickBtn) {
                panel.classList.remove('open');
            }
        });
    }

    function applyDatePreset(range) {
        var fromEl = document.getElementById('adsDateFrom');
        var toEl = document.getElementById('adsDateTo');
        if (!fromEl || !toEl) return;

        var today = new Date();
        var from = new Date(today);
        var to = new Date(today);

        if (range === 'today') {
            // Already initialized as today
        } else if (range === 'yesterday') {
            from.setDate(from.getDate() - 1);
            to.setDate(to.getDate() - 1);
        } else if (range === 'last7') {
            from.setDate(from.getDate() - 6);
        } else if (range === 'last14') {
            from.setDate(from.getDate() - 13);
        } else if (range === 'last30') {
            from.setDate(from.getDate() - 29);
        } else if (range === 'thisMonth' || range === 'allMonthToDate') {
            from = new Date(today.getFullYear(), today.getMonth(), 1);
        } else if (range === 'lastMonth') {
            from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            to = new Date(today.getFullYear(), today.getMonth(), 0);
        }

        fromEl.value = fmtDate(from);
        toEl.value = fmtDate(to);

        setPill('Đã chọn bộ lọc ngày, bấm Cập Nhật', '');
    }

    // ---- COL RESIZE ----
    function setupColResize() {
        document.querySelectorAll('.col-resize-handle').forEach(function (handle) {
            var startX, startWidth, col;
            handle.addEventListener('mousedown', function (e) {
                e.preventDefault(); e.stopPropagation();
                col = document.getElementById(handle.dataset.col);
                if (!col) return;
                startX = e.pageX;
                startWidth = col.offsetWidth;
                handle.classList.add('dragging');

                function onMove(ev) {
                    var newW = Math.max(60, startWidth + ev.pageX - startX);
                    col.style.width = newW + 'px';
                }
                function onUp() {
                    handle.classList.remove('dragging');
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                }
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        });
    }

    // ---- SYNC ----
    async function syncNow() {
        var accountId = (document.getElementById('adsAccountSelect') || {}).value || currentAccount;
        var since = (document.getElementById('adsDateFrom') || {}).value;
        var until = (document.getElementById('adsDateTo') || {}).value;

        if (!accountId) {
            setPill('Chọn tài khoản trước', 'err');
            return;
        }
        if (!since || !until) {
            setPill('Chọn ngày trước', 'err');
            return;
        }

        currentAccount = accountId;
        renderAccountChips();

        var noticeEl = document.getElementById('adsAccountNoticeText');
        if (noticeEl) noticeEl.innerHTML = 'Đang xem: <strong>' + getAccountName(accountId) + '</strong> &nbsp;|&nbsp; ' + since + ' → ' + until;

        var dateRangeEl = document.getElementById('statsDateRange');
        if (dateRangeEl) dateRangeEl.textContent = since + ' → ' + until;

        var syncBtn = document.getElementById('adsSyncBtn');
        if (syncBtn) syncBtn.disabled = true;
        setPill('⏳ Đang đồng bộ...', 'syncing');

        try {
            var url = CFG.syncEndpoint + '?account=' + encodeURIComponent(accountId) + '&since=' + since + '&until=' + until;
            var res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            var result = await res.json();
            if (!result.success) throw new Error(result.error || 'Lỗi API');

            // Render trực tiếp ngay sau khi API trả về để tránh phụ thuộc hoàn toàn vào realtime query.
            allCampaigns = Array.isArray(result.data) ? result.data : [];
            applyFilterSort();
            updateStats();

            // Save to Firestore
            if (db && result.data && result.data.length > 0) {
                try {
                    var batch = db.batch();
                    result.data.forEach(function (c) {
                        batch.set(db.collection(CFG.firestoreCollection).doc(c.id + '_' + since + '_' + until), c);
                    });
                    await batch.commit();
                } catch (fireErr) {
                    console.warn('Firestore write error:', fireErr.message);
                }
            }

            localStorage.setItem(CFG.syncTimeKey, Date.now().toString());
            setPill('✅ ' + result.message, 'ok');

            // Subscribe realtime for this account+date
            subscribeRealtime(accountId, since, until);

        } catch (err) {
            console.error('Sync error:', err);
            setPill('❌ ' + err.message, 'err');
        } finally {
            if (syncBtn) syncBtn.disabled = false;
        }
    }

    function getAccountName(id) {
        var a = accounts.find(function (x) { return x.id === id; });
        return a ? a.name : id;
    }

    // ---- FILTER + SORT ----
    function applyFilterSort() {
        filteredCampaigns = allCampaigns.filter(function (c) {
            var mf = currentFilter === 'all' || c.status === currentFilter;
            var ms = !searchQuery || (c.name || '').toLowerCase().indexOf(searchQuery) >= 0;
            return mf && ms;
        });
        if (currentSort.col) {
            var col = currentSort.col, asc = currentSort.asc;
            filteredCampaigns.sort(function (a, b) {
                var va = col === 'name' ? (a.name||'').toLowerCase() : parseFloat(a[col]||0);
                var vb = col === 'name' ? (b.name||'').toLowerCase() : parseFloat(b[col]||0);
                if (va < vb) return asc ? -1 : 1;
                if (va > vb) return asc ? 1 : -1;
                return 0;
            });
        }
        renderTable();
        renderFooter();
    }

    // ---- RENDER TABLE ----
    function renderTable() {
        var tbody = document.getElementById('ads-tbody');
        var countEl = document.getElementById('adsTableCount');
        if (!tbody) return;

        if (!filteredCampaigns.length) {
            tbody.innerHTML = '<tr><td colspan="13" class="ads-empty-cell">' +
                (allCampaigns.length === 0 ? 'Chưa có dữ liệu. Nhấn "Cập Nhật" để tải.' : 'Không tìm thấy chiến dịch.') +
                '</td></tr>';
            if (countEl) countEl.textContent = '';
            return;
        }
        if (countEl) countEl.textContent = filteredCampaigns.length + ' chiến dịch';

        tbody.innerHTML = filteredCampaigns.map(function (c) {
            var isActive = c.status === 'ACTIVE';
            var isPaused = c.status === 'PAUSED';
            var dotCls  = isActive ? 'active' : isPaused ? 'paused' : 'inactive';
            var distCls = isActive ? 'dist-active' : isPaused ? 'dist-paused' : 'dist-inactive';
            var distTxt = isActive ? '● Đang hoạt động' : isPaused ? '⏸ Tạm dừng' : '○ Đang tắt';
            var spend   = parseFloat(c.spend || 0);
            var imp     = parseInt(c.impressions || 0);
            var clk     = parseInt(c.clicks || 0);
            var reach   = parseInt(c.reach || 0);
            var cpm     = imp > 0 ? Math.round((spend / imp) * 1000) : 0;
            var created = c.created_time ? new Date(c.created_time).toLocaleDateString('vi-VN') : '—';
            var budget  = c.budget || '—';

            return '<tr>' +
                '<td><input type="checkbox" class="ads-row-check"></td>' +
                '<td><div class="camp-name-cell"><span class="status-dot ' + dotCls + '"></span>' +
                    '<span class="camp-name-text" title="' + esc(c.name||'') + '">' + esc(c.name||'—') + '</span></div></td>' +
                '<td><span class="dist-badge ' + distCls + '">' + distTxt + '</span></td>' +
                '<td class="budget-cell">' + esc(budget) + '</td>' +
                '<td class="num-cell spend' + (spend===0?' zero':'') + '">' + (spend>0 ? fmtCur(spend) : '—') + '</td>' +
                '<td class="num-cell' + (imp===0?' zero':'') + '">' + (imp>0 ? fmtNum(imp) : '—') + '</td>' +
                '<td class="num-cell' + (reach===0?' zero':'') + '">' + (reach>0 ? fmtNum(reach) : '—') + '</td>' +
                '<td class="num-cell' + (clk===0?' zero':'') + '">' + (clk>0 ? fmtNum(clk) : '—') + '</td>' +
                '<td class="num-cell">' + (c.actions > 0 ? c.actions : '—') + '</td>' +
                '<td class="num-cell">' + (parseFloat(c.cpc)>0 ? fmtCur(c.cpc) : '—') + '</td>' +
                '<td class="num-cell">' + (parseFloat(c.ctr)>0 ? c.ctr+'%' : '—') + '</td>' +
                '<td class="num-cell">' + (cpm>0 ? fmtCur(cpm) : '—') + '</td>' +
                '<td style="color:#6b7280;font-size:.8rem;">' + created + '</td>' +
                '</tr>';
        }).join('');
    }

    // ---- RENDER FOOTER TOTALS ----
    function renderFooter() {
        var tfoot = document.getElementById('ads-tfoot');
        var footEl = document.getElementById('adsFooterText');
        if (!tfoot) return;
        if (!filteredCampaigns.length) { tfoot.innerHTML = ''; return; }

        var ts  = filteredCampaigns.reduce(function(s,c){ return s+parseFloat(c.spend||0); }, 0);
        var ti  = filteredCampaigns.reduce(function(s,c){ return s+parseInt(c.impressions||0); }, 0);
        var tr  = filteredCampaigns.reduce(function(s,c){ return s+parseInt(c.reach||0); }, 0);
        var tc  = filteredCampaigns.reduce(function(s,c){ return s+parseInt(c.clicks||0); }, 0);
        var tac = filteredCampaigns.reduce(function(s,c){ return s+parseFloat(c.actions||0); }, 0);
        var avgCpc = tc > 0 ? (ts/tc).toFixed(0) : 0;
        var avgCtr = ti > 0 ? ((tc/ti)*100).toFixed(2) : 0;
        var totalCpm = ti > 0 ? Math.round((ts/ti)*1000) : 0;

        tfoot.innerHTML = '<tr><td></td>' +
            '<td style="color:var(--ink);">Tổng ' + filteredCampaigns.length + ' chiến dịch</td>' +
            '<td></td>' +
            '<td></td>' +
            '<td class="num-cell spend">' + fmtCur(ts) + '</td>' +
            '<td class="num-cell">' + fmtNum(ti) + '</td>' +
            '<td class="num-cell">' + fmtNum(tr) + '</td>' +
            '<td class="num-cell">' + fmtNum(tc) + '</td>' +
            '<td class="num-cell">' + tac + '</td>' +
            '<td class="num-cell">' + fmtCur(avgCpc) + '</td>' +
            '<td class="num-cell">' + avgCtr + '%</td>' +
            '<td class="num-cell">' + fmtCur(totalCpm) + '</td>' +
            '<td></td></tr>';

        if (footEl) footEl.textContent = 'Hiển thị ' + filteredCampaigns.length + ' / ' + allCampaigns.length + ' chiến dịch';
    }

    // ---- UPDATE STAT CARDS ----
    function updateStats() {
        var ts   = allCampaigns.reduce(function(s,c){ return s+parseFloat(c.spend||0); }, 0);
        var ti   = allCampaigns.reduce(function(s,c){ return s+parseInt(c.impressions||0); }, 0);
        var tr   = allCampaigns.reduce(function(s,c){ return s+parseInt(c.reach||0); }, 0);
        var tc   = allCampaigns.reduce(function(s,c){ return s+parseInt(c.clicks||0); }, 0);
        var tac  = allCampaigns.reduce(function(s,c){ return s+parseFloat(c.actions||0); }, 0);
        var act  = allCampaigns.filter(function(c){ return c.status==='ACTIVE'; }).length;
        var avgCpc = tc>0 ? (ts/tc).toFixed(0) : 0;
        var avgCtr = ti>0 ? ((tc/ti)*100).toFixed(2) : 0;

        var el = function(id){ return document.getElementById(id); };
        if(el('statsActiveCamp'))  el('statsActiveCamp').textContent  = act;
        if(el('statsTotalCamp'))   el('statsTotalCamp').textContent   = '/ ' + allCampaigns.length + ' tổng';
        if(el('statsTotalSpend'))  el('statsTotalSpend').textContent  = fmtCur(ts);
        if(el('statsImpressions')) el('statsImpressions').textContent = fmtNum(ti);
        if(el('statsReach'))       el('statsReach').textContent       = fmtNum(tr);
        if(el('statsClicks'))      el('statsClicks').textContent      = fmtNum(tc);
        if(el('statsCpc'))         el('statsCpc').textContent         = fmtCur(avgCpc);
        if(el('statsCtr'))         el('statsCtr').textContent         = avgCtr + '%';
        if(el('statsConversions')) el('statsConversions').textContent = Math.round(tac);
    }

    // ---- HELPERS ----
    function fmtNum(n) {
        n = parseInt(n || 0);
        if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
        if (n >= 1000)    return (n/1000).toFixed(1) + 'K';
        return n.toLocaleString('vi-VN');
    }
    function fmtCur(n) {
        return parseFloat(n||0).toLocaleString('vi-VN', {maximumFractionDigits:0}) + '₫';
    }
    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function setPill(msg, type) {
        var el = document.getElementById('adsSyncPill');
        if (!el) return;
        el.textContent = msg;
        el.className = 'ads-sync-pill ' + (type || '');
        if (type === 'ok' || type === 'err') {
            setTimeout(function () {
                el.textContent = 'Cập nhật: ' + new Date().toLocaleTimeString('vi-VN');
                el.className = 'ads-sync-pill';
            }, 5000);
        }
    }

    window.addEventListener('beforeunload', function () {
        if (syncTimer) clearInterval(syncTimer);
        if (unsubscribe) unsubscribe();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.AdsManager = {
        sync: syncNow,
        data: function () { return allCampaigns; },
        accounts: function () { return accounts; }
    };
})();
