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
        syncInterval: 3600000,
        realtimeIntervalMs: 30000,
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
    var isSyncing = false;

    // ---- INIT ----
    function init() {
    loadAccounts();
    setDefaultDates();
    renderAccountSelect();
    renderAccountChips();
    renderTable(); // Thêm dòng này trước setupEvents()
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
    // Firestore-based account management
    function loadAccounts() {
        if (!db) { accounts = []; return; }
        db.collection('ads_accounts').get().then(function (snap) {
            accounts = [];
            snap.forEach(function (doc) {
                accounts.push(doc.data());
            });
            renderAccountSelect();
            renderAccountChips();
            // Nếu chưa có tài khoản nào, tự động mở panel thêm tài khoản
            if (accounts.length === 0) {
                var panel = document.getElementById('adsAccountPanel');
                if (panel) {
                    panel.classList.add('open');
                    panel.style.display = 'block';
                }
            }
        });
        // Listen realtime
        if (window._adsAccountsUnsub) window._adsAccountsUnsub();
        window._adsAccountsUnsub = db.collection('ads_accounts').onSnapshot(function (snap) {
            accounts = [];
            snap.forEach(function (doc) { accounts.push(doc.data()); });
            renderAccountSelect();
            renderAccountChips();
        });
    }
    async function saveAccounts() {
        if (!db) return;
        // Sync all accounts to Firestore (overwrite all)
        var batch = db.batch();
        accounts.forEach(function (a) {
            batch.set(db.collection('ads_accounts').doc(a.id), a);
        });
        await batch.commit();
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
            btn.addEventListener('click', async function (e) {
                e.stopPropagation();
                var idx = parseInt(this.dataset.idx);
                var acc = accounts[idx];
                if (!db || !acc) return;
                await db.collection('ads_accounts').doc(acc.id).delete();
                // Firestore realtime sẽ tự cập nhật lại UI
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
                                // Đảm bảo panel có thể mở/đóng đúng, không lặp event
                                var manageBtn = document.getElementById('adsManageAccountsBtn');
                                if (manageBtn) {
                                    manageBtn.onclick = function () {
                                        var panel = document.getElementById('adsAccountPanel');
                                        if (panel) {
                                            panel.classList.add('open');
                                            panel.style.display = 'block';
                                        }
                                    };
                                }
                                var closeBtn = document.getElementById('adsCloseAccountPanelBtn');
                                if (closeBtn) {
                                    closeBtn.onclick = function () {
                                        var panel = document.getElementById('adsAccountPanel');
                                        if (panel) {
                                            panel.classList.remove('open');
                                            panel.style.display = 'none';
                                        }
                                    };
                                }
                                // Bộ lọc nhanh ngày: chỉ gán event 1 lần, luôn enable
                                var quickBtn = document.getElementById('adsDateQuickBtn');
                                var quickPanel = document.getElementById('adsDateQuickPanel');
                                if (quickBtn && quickPanel) {
                                    quickBtn.disabled = false;
                                    quickBtn.onclick = function (e) {
                                        e.stopPropagation();
                                        quickPanel.classList.toggle('open');
                                    };
                                    quickPanel.querySelectorAll('.ads-date-preset').forEach(function (btn) {
                                        btn.disabled = false;
                                        btn.onclick = function () {
                                            var range = this.dataset.range;
                                            applyDatePreset(range);
                                            quickPanel.classList.remove('open');
                                        };
                                    });
                                    document.addEventListener('click', function (e) {
                                        if (!quickPanel.classList.contains('open')) return;
                                        if (!quickPanel.contains(e.target) && e.target !== quickBtn) {
                                            quickPanel.classList.remove('open');
                                        }
                                    });
                                }
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

                // Tắt hoàn toàn auto-refresh sau khi cập nhật
                if (syncTimer) {
                    clearInterval(syncTimer);
                    syncTimer = null;
                }
        var manageBtn = document.getElementById('adsManageAccountsBtn');
        if (manageBtn) manageBtn.addEventListener('click', function () {
            var panel = document.getElementById('adsAccountPanel');
            if (panel) {
                panel.classList.add('open');
                panel.style.display = 'block';
            }
        });

        var addBtn = document.getElementById('adsAddAccountBtn');
        if (addBtn) {
            addBtn.onclick = async function () {
                var idEl   = document.getElementById('adsNewAccountId');
                var nameEl = document.getElementById('adsNewAccountName');
                var newId  = (idEl ? idEl.value.trim() : '');
                var newName = (nameEl ? nameEl.value.trim() : '') || newId;
                if (!newId) { setPill('Vui lòng nhập Ad Account ID (dạng act_xxx)', 'err'); return; }
                if (!newId.startsWith('act_')) newId = 'act_' + newId;
                if (accounts.some(function (a) { return a.id === newId; })) {
                    setPill('Tài khoản này đã tồn tại', 'err'); return;
                }
                if (!db) return;
                await db.collection('ads_accounts').doc(newId).set({ id: newId, name: newName });
                if (idEl)   idEl.value   = '';
                if (nameEl) nameEl.value = '';
                setPill('Đã thêm tài khoản mới!', 'ok');
                // Firestore realtime sẽ tự cập nhật lại UI
            };
        }

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

        // Xóa event cũ nếu có
        quickBtn.onclick = null;
        panel.querySelectorAll('.ads-date-preset').forEach(function (btn) { btn.onclick = null; });

        quickBtn.onclick = function (e) {
            e.stopPropagation();
            panel.classList.toggle('open');
        };
        panel.querySelectorAll('.ads-date-preset').forEach(function (btn) {
            btn.onclick = function () {
                var range = this.dataset.range;
                applyDatePreset(range);
                panel.classList.remove('open');
            };
        });
        document.addEventListener('click', function (e) {
            if (!panel.classList.contains('open')) return;
            if (!panel.contains(e.target) && e.target !== quickBtn) {
                panel.classList.remove('open');
            }
        });
    }

    // Hàm preset ngày nhanh
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
        // Xóa event cũ để tránh lặp event khi render lại
        document.querySelectorAll('.col-resize-handle').forEach(function (handle) {
            handle.onmousedown = null;
        });
        document.querySelectorAll('.col-resize-handle').forEach(function (handle) {
            var startX, startWidth, col;
            handle.onmousedown = function (e) {
                e.preventDefault(); e.stopPropagation();
                col = handle.closest('th');
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
            };
        });
            // Xóa event cũ nếu có
            var quickBtn = document.getElementById('adsDateQuickBtn');
            var panel = document.getElementById('adsDateQuickPanel');
            if (!quickBtn || !panel) return;
            quickBtn.onclick = null;
            panel.querySelectorAll('.ads-date-preset').forEach(function (btn) { btn.onclick = null; });
            quickBtn.onclick = function (e) {
                e.stopPropagation();
                panel.classList.toggle('open');
            };
            panel.querySelectorAll('.ads-date-preset').forEach(function (btn) {
                btn.onclick = function () {
                    var range = this.dataset.range;
                    applyDatePreset(range);
                    panel.classList.remove('open');
                };
            });
            document.addEventListener('click', function (e) {
                if (!panel.classList.contains('open')) return;
                if (!panel.contains(e.target) && e.target !== quickBtn) {
                    panel.classList.remove('open');
                }
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

        await runSync(accountId, since, until, false);

        if (syncBtn) syncBtn.disabled = false;
    }

    async function runSync(accountId, since, until, fromRealtime) {
        if (isSyncing) return;
        isSyncing = true;

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

            if (fromRealtime) {
                setPill('🔴 Realtime: 30s/lần | Lần cuối ' + new Date().toLocaleTimeString('vi-VN'), 'live');
            } else {
                setPill('✅ ' + result.message, 'ok');
            }

            // Subscribe realtime for this account+date
            subscribeRealtime(accountId, since, until);

            if (!fromRealtime) {
                startRealtimeSync(accountId, since, until);
            }

        } catch (err) {
            console.error('Sync error:', err);
            setPill('❌ ' + err.message, 'err');
        } finally {
            isSyncing = false;
        }
    }

    function startRealtimeSync(accountId, since, until) {
        if (syncTimer) {
            clearInterval(syncTimer);
            syncTimer = null;
        }

        syncTimer = setInterval(function () {
            runSync(accountId, since, until, true);
        }, CFG.realtimeIntervalMs);
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
            tbody.innerHTML = '<tr><td colspan="21" class="ads-empty-cell">' +
                (allCampaigns.length === 0 ? 'Chưa có dữ liệu hoặc API không khả dụng. Bạn vẫn có thể thêm tài khoản, chọn bộ lọc, thử lại sau.' : 'Không tìm thấy chiến dịch.') +
                '</td></tr>';
            if (countEl) countEl.textContent = '';
            setupColResize();
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
            var contacts = parseFloat(c.conversions || 0);
            var replies = parseFloat(c.actions || 0);
            var costPerResult = parseFloat(c.cost_per_result || 0);
            var convValue = parseFloat(c.conversion_value || 0);
            var checkout = parseFloat(c.start_checkout || 0);
            var costPerCheckout = parseFloat(c.cost_per_checkout || 0);
            var toggleCls = isActive ? 'on' : '';

            return '<tr>' +
                '<td><input type="checkbox" class="ads-row-check"></td>' +
                '<td><span class="status-toggle ' + toggleCls + '" title="' + (isActive ? 'Đang bật' : 'Đang tắt') + '"></span></td>' +
                '<td><div class="camp-name-cell"><span class="status-dot ' + dotCls + '"></span>' +
                    '<span class="camp-name-text" title="' + esc(c.name||'') + '">' + esc(c.name||'—') + '</span></div></td>' +
                '<td><span class="dist-badge ' + distCls + '">' + distTxt + '</span></td>' +
                '<td style="color:#6b7280;">—</td>' +
                '<td class="budget-cell">' + esc(budget) + '</td>' +
                '<td class="num-cell">' + (costPerResult > 0 ? fmtCur(costPerResult) : '—') + '</td>' +
                '<td class="num-cell spend' + (spend===0?' zero':'') + '">' + (spend>0 ? fmtCur(spend) : '—') + '</td>' +
                '<td class="num-cell">' + (contacts > 0 ? fmtNum(contacts) : '—') + '</td>' +
                '<td class="num-cell">' + (replies > 0 ? fmtNum(replies) : '—') + '</td>' +
                '<td class="num-cell' + (imp===0?' zero':'') + '">' + (imp>0 ? fmtNum(imp) : '—') + '</td>' +
                '<td class="num-cell' + (reach===0?' zero':'') + '">' + (reach>0 ? fmtNum(reach) : '—') + '</td>' +
                '<td class="num-cell' + (clk===0?' zero':'') + '">' + (clk>0 ? fmtNum(clk) : '—') + '</td>' +
                '<td class="num-cell">' + (c.actions > 0 ? c.actions : '—') + '</td>' +
                '<td class="num-cell">' + (parseFloat(c.cpc)>0 ? fmtCur(c.cpc) : '—') + '</td>' +
                '<td class="num-cell">' + (cpm>0 ? fmtCur(cpm) : '—') + '</td>' +
                '<td class="num-cell">' + (convValue > 0 ? fmtCur(convValue) : '—') + '</td>' +
                '<td class="num-cell">' + (checkout > 0 ? fmtNum(checkout) : '—') + '</td>' +
                '<td class="num-cell">' + (costPerCheckout > 0 ? fmtCur(costPerCheckout) : '—') + '</td>' +
                '<td class="num-cell">' + (parseFloat(c.ctr)>0 ? c.ctr+'%' : '—') + '</td>' +
                '<td style="color:#6b7280;font-size:.8rem;">' + created + '</td>' +
                '</tr>';
        }).join('');
        // Đảm bảo kéo cột luôn hoạt động sau mỗi lần render
        setupColResize();
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
        var tcr = filteredCampaigns.reduce(function(s,c){ return s+parseFloat(c.conversions||0); }, 0);
        var tcv = filteredCampaigns.reduce(function(s,c){ return s+parseFloat(c.conversion_value||0); }, 0);
        var tck = filteredCampaigns.reduce(function(s,c){ return s+parseFloat(c.start_checkout||0); }, 0);
        var avgCpc = tc > 0 ? (ts/tc).toFixed(0) : 0;
        var avgCtr = ti > 0 ? ((tc/ti)*100).toFixed(2) : 0;
        var totalCpm = ti > 0 ? Math.round((ts/ti)*1000) : 0;
        var avgCostPerResult = tcr > 0 ? (ts/tcr) : 0;
        var avgCostPerCheckout = tck > 0 ? (ts/tck) : 0;

        tfoot.innerHTML = '<tr><td></td>' +
            '<td></td>' +
            '<td style="color:var(--ink);">Tổng ' + filteredCampaigns.length + ' chiến dịch</td>' +
            '<td></td>' +
            '<td></td>' +
            '<td></td>' +
            '<td class="num-cell">' + (avgCostPerResult > 0 ? fmtCur(avgCostPerResult) : '—') + '</td>' +
            '<td class="num-cell spend">' + fmtCur(ts) + '</td>' +
            '<td class="num-cell">' + fmtNum(tcr) + '</td>' +
            '<td class="num-cell">' + fmtNum(tac) + '</td>' +
            '<td class="num-cell">' + fmtNum(ti) + '</td>' +
            '<td class="num-cell">' + fmtNum(tr) + '</td>' +
            '<td class="num-cell">' + fmtNum(tc) + '</td>' +
            '<td class="num-cell">' + tac + '</td>' +
            '<td class="num-cell">' + fmtCur(avgCpc) + '</td>' +
            '<td class="num-cell">' + fmtCur(totalCpm) + '</td>' +
            '<td class="num-cell">' + (tcv > 0 ? fmtCur(tcv) : '—') + '</td>' +
            '<td class="num-cell">' + fmtNum(tck) + '</td>' +
            '<td class="num-cell">' + (avgCostPerCheckout > 0 ? fmtCur(avgCostPerCheckout) : '—') + '</td>' +
            '<td class="num-cell">' + avgCtr + '%</td>' +
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
        n = parseFloat(n || 0);
        if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
        if (n >= 1000)    return (n/1000).toFixed(1) + 'K';
        return Math.round(n).toLocaleString('vi-VN');
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
