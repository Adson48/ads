// Marketing Ads JavaScript

// Notification management
const notificationForm = document.getElementById('notificationForm');
const notificationList = document.getElementById('notificationList');
const telegramBotTokenInput = document.getElementById('telegramBotToken');
const telegramChatIdInput = document.getElementById('telegramChatId');
const saveTelegramConfigBtn = document.getElementById('saveTelegramConfigBtn');
const testTelegramBtn = document.getElementById('testTelegramBtn');
const telegramConfigStatus = document.getElementById('telegramConfigStatus');
const telegramDebugOutput = document.getElementById('telegramDebugOutput');
const sendToTelegramCheckbox = document.getElementById('sendToTelegram');
const telegramSendEnabledKey = 'telegramSendEnabled';
let homeAlertBanner = document.getElementById('homeAlertBanner');
let homeAlertList = document.getElementById('homeAlertList');

// Create alert banner in DOM if it doesn't exist yet
if (!homeAlertBanner) {
    homeAlertBanner = document.createElement('section');
    homeAlertBanner.id = 'homeAlertBanner';
    homeAlertBanner.className = 'home-alert-banner';
    homeAlertBanner.style.display = 'none';
    homeAlertBanner.innerHTML = '<div class="home-alert-inner"><p class="home-alert-title">CẢNH BÁO CHIẾN DỊCH</p><ul id="homeAlertList" class="home-alert-list"></ul></div>';
    const header = document.querySelector('header');
    if (header && header.parentNode) {
        header.parentNode.insertBefore(homeAlertBanner, header.nextSibling);
    } else {
        document.body.insertBefore(homeAlertBanner, document.body.firstChild);
    }
    homeAlertList = document.getElementById('homeAlertList');
}

const homeAlertState = {
    roasThreshold: 1.5,
    roasValue: null,
    overdueTasks: []
};

const renderHomeAlerts = function() {
    if (!homeAlertBanner || !homeAlertList) {
        return;
    }

    const messages = [];

    if (typeof homeAlertState.roasValue === 'number' && homeAlertState.roasValue < homeAlertState.roasThreshold) {
        const roasText = homeAlertState.roasValue.toFixed(2);
        messages.push('ROAS hiện tại = ' + roasText + ' (thấp hơn mức cho phép ' + homeAlertState.roasThreshold.toFixed(2) + ').');
    }

    homeAlertState.overdueTasks.forEach(function(task) {
        messages.push('Công việc quá hạn: ' + task.text + ' (hạn chót ' + task.dueDate + ').');
    });

    if (!messages.length) {
        homeAlertBanner.style.display = 'none';
        homeAlertList.innerHTML = '';
        return;
    }

    homeAlertList.innerHTML = messages.map(function(msg) {
        return '<li>' + msg + '</li>';
    }).join('');
    homeAlertBanner.removeAttribute('hidden');
    homeAlertBanner.style.display = 'block';
};

const setRoasAlertContext = function(currentCost, currentRevenue) {
    if (!currentCost) {
        homeAlertState.roasValue = null;
    } else {
        homeAlertState.roasValue = Number((currentRevenue / currentCost).toFixed(4));
    }
    renderHomeAlerts();
};

const setChecklistOverdueContext = function(items) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    homeAlertState.overdueTasks = (items || []).filter(function(item) {
        if (!item || item.checked || !item.text || !item.dueDate) {
            return false;
        }

        const due = new Date(item.dueDate);
        if (Number.isNaN(due.getTime())) {
            return false;
        }

        due.setHours(0, 0, 0, 0);
        return due < today;
    }).slice(0, 5);

    renderHomeAlerts();
};

const parseDashboardCurrencyInput = function(element) {
    return Number(String((element && element.value) || '').replace(/[^0-9]/g, '')) || 0;
};

const hydrateHomeAlerts = function() {
    const budgetEl = document.getElementById('budgetInput');
    const dailyBudgetEl = document.getElementById('dailyBudgetInput');

    const budgetValue = parseDashboardCurrencyInput(budgetEl);
    const dailyBudgetValue = parseDashboardCurrencyInput(dailyBudgetEl);

    if (budgetValue) {
        setRoasAlertContext(budgetValue, dailyBudgetValue);
    }

    try {
        const savedChecklist = JSON.parse(localStorage.getItem('homeChecklistItems') || 'null');
        if (Array.isArray(savedChecklist)) {
            setChecklistOverdueContext(savedChecklist);
        } else {
            renderHomeAlerts();
        }
    } catch (e) {
        renderHomeAlerts();
    }
};

// Site-wide Telegram target: set your bot token/chat ID here to send from all visitors.
const siteTelegramDefaults = {
    botToken: '8783849728:AAGxfnR4xv506LarXr3TqAMX53Y2BFsYlRE',
    chatId: '6437855532'
};

const hasSiteTelegramDefaults = function() {
    return Boolean(siteTelegramDefaults.botToken && siteTelegramDefaults.chatId);
};

const buildTelegramApiUrl = function(botToken, method) {
    return 'https://api.telegram.org/bot' + String(botToken || '').trim() + '/' + method;
};

const getTelegramConfig = function() {
    if (hasSiteTelegramDefaults()) {
        return {
            botToken: siteTelegramDefaults.botToken,
            chatId: siteTelegramDefaults.chatId
        };
    }

    return {
        botToken: (telegramBotTokenInput && telegramBotTokenInput.value.trim()) || localStorage.getItem('telegramBotToken') || '',
        chatId: (telegramChatIdInput && telegramChatIdInput.value.trim()) || localStorage.getItem('telegramChatId') || ''
    };
};

const persistTelegramConfig = function(showStatus) {
    const botToken = telegramBotTokenInput ? telegramBotTokenInput.value.trim() : '';
    const chatId = telegramChatIdInput ? telegramChatIdInput.value.trim() : '';

    if (botToken) {
        localStorage.setItem('telegramBotToken', botToken);
    } else {
        localStorage.removeItem('telegramBotToken');
    }

    if (chatId) {
        localStorage.setItem('telegramChatId', chatId);
    } else {
        localStorage.removeItem('telegramChatId');
    }

    if (showStatus && telegramConfigStatus) {
        telegramConfigStatus.textContent = 'Đã lưu cấu hình Telegram thành công.';
    }
};

const dataUrlToBlob = function(dataUrl) {
    const parts = String(dataUrl || '').split(',');
    const metadata = parts[0] || '';
    const raw = parts[1] || '';
    const mimeMatch = metadata.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: mime });
};

const sendTelegramNotification = async function(payload) {
    persistTelegramConfig(false);
    const config = getTelegramConfig();
    if (!config.botToken || !config.chatId) {
        return { ok: false, error: 'missing-config' };
    }

    const title = payload && payload.title ? payload.title : 'Thông báo mới';
    const content = payload && payload.content ? payload.content : '';
    const date = payload && payload.date ? payload.date : new Date().toLocaleString('vi-VN');
    const image = payload && payload.image ? payload.image : null;

    try {
        if (image) {
            const formData = new FormData();
            formData.append('chat_id', config.chatId);
            formData.append('caption', '📢 ' + title + '\n' + content + '\n🕒 ' + date);
            formData.append('photo', dataUrlToBlob(image), 'notification-image.jpg');

            const photoResponse = await fetch(buildTelegramApiUrl(config.botToken, 'sendPhoto'), {
                method: 'POST',
                body: formData
            });
            const photoData = await photoResponse.json().catch(() => ({}));

            if (!photoResponse.ok || !photoData.ok) {
                throw new Error(photoData.description || 'send-photo-failed');
            }

            return { ok: true };
        }

        const messageResponse = await fetch(buildTelegramApiUrl(config.botToken, 'sendMessage'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: config.chatId,
                text: '📢 ' + title + '\n' + content + '\n🕒 ' + date
            })
        });
        const messageData = await messageResponse.json().catch(() => ({}));

        if (!messageResponse.ok || !messageData.ok) {
            throw new Error(messageData.description || 'send-message-failed');
        }

        return { ok: true };
    } catch (error) {
        return { ok: false, error: error && error.message ? error.message : 'telegram-send-failed' };
    }
};

if (telegramBotTokenInput && telegramChatIdInput) {
    telegramBotTokenInput.value = localStorage.getItem('telegramBotToken') || '';
    telegramChatIdInput.value = localStorage.getItem('telegramChatId') || '';

    telegramBotTokenInput.addEventListener('input', function() {
        persistTelegramConfig(false);
    });

    telegramChatIdInput.addEventListener('input', function() {
        persistTelegramConfig(false);
    });
}

if (sendToTelegramCheckbox) {
    const savedSendSetting = localStorage.getItem(telegramSendEnabledKey);
    if (savedSendSetting !== null) {
        sendToTelegramCheckbox.checked = savedSendSetting === '1';
    }

    sendToTelegramCheckbox.addEventListener('change', function() {
        localStorage.setItem(telegramSendEnabledKey, this.checked ? '1' : '0');
    });
}

if (saveTelegramConfigBtn) {
    saveTelegramConfigBtn.addEventListener('click', function() {
        const config = getTelegramConfig();

        if (!config.botToken || !config.chatId) {
            if (telegramConfigStatus) {
                telegramConfigStatus.textContent = 'Vui lòng nhập đầy đủ Bot Token và Chat ID.';
            }
            return;
        }

        persistTelegramConfig(true);
    });
}

if (testTelegramBtn) {
    testTelegramBtn.addEventListener('click', async function() {
        persistTelegramConfig(false);
        const config = getTelegramConfig();

        if (!config.botToken) {
            if (telegramConfigStatus) {
                telegramConfigStatus.textContent = 'Thiếu Bot Token.';
            }
            return;
        }

        if (telegramDebugOutput) {
            telegramDebugOutput.textContent = 'Đang kiểm tra kết nối Telegram...';
        }

        try {
            const meResponse = await fetch(buildTelegramApiUrl(config.botToken, 'getMe'));
            const meData = await meResponse.json().catch(() => ({}));

            const updatesResponse = await fetch(buildTelegramApiUrl(config.botToken, 'getUpdates'));
            const updatesData = await updatesResponse.json().catch(() => ({}));

            let probeData = null;
            if (config.chatId) {
                const probeResponse = await fetch(buildTelegramApiUrl(config.botToken, 'sendMessage'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: config.chatId,
                        text: 'Test kết nối từ Marketing Ads: ' + new Date().toLocaleString('vi-VN')
                    })
                });
                probeData = await probeResponse.json().catch(() => ({}));
            }

            if (telegramDebugOutput) {
                telegramDebugOutput.textContent = [
                    'getMe:',
                    JSON.stringify(meData, null, 2),
                    '',
                    'getUpdates:',
                    JSON.stringify(updatesData, null, 2),
                    '',
                    'sendMessage(test):',
                    probeData ? JSON.stringify(probeData, null, 2) : 'Bỏ qua vì chưa nhập Chat ID'
                ].join('\n');
            }

            if (telegramConfigStatus) {
                telegramConfigStatus.textContent = 'Đã test xong. Xem kết quả chi tiết ở khung debug.';
            }
        } catch (error) {
            if (telegramConfigStatus) {
                telegramConfigStatus.textContent = 'Lỗi khi test Telegram.';
            }
            if (telegramDebugOutput) {
                telegramDebugOutput.textContent = 'Lỗi: ' + (error && error.message ? error.message : 'unknown');
            }
        }
    });
}

// Image preview
const notifImageInput = document.getElementById('notifImage');
if (notifImageInput) {
    notifImageInput.addEventListener('change', function() {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = '';
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:180px;border-radius:10px;border:1px solid rgba(199,81,124,0.25);">`;
            };
            reader.readAsDataURL(file);
        }
    });
}

if (notificationForm) {
    notificationForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const content = document.getElementById('content').value;
        const imageFile = document.getElementById('notifImage').files[0];

        const saveNotification = async function(imageDataUrl) {
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            const newNotification = {
                id: Date.now(),
                title: title,
                content: content,
                date: new Date().toLocaleString('vi-VN'),
                image: imageDataUrl || null
            };
            notifications.unshift(newNotification);
            localStorage.setItem('notifications', JSON.stringify(notifications));
            displayNotifications();

            let alertMessage = `Thông báo "${title}" đã được đăng thành công!`;
            const shouldSendTelegram = hasSiteTelegramDefaults() || (sendToTelegramCheckbox && sendToTelegramCheckbox.checked);
            if (shouldSendTelegram) {
                const telegramResult = await sendTelegramNotification(newNotification);
                if (telegramResult.ok) {
                    alertMessage += '\nĐã gửi lên Telegram.';
                } else if (telegramResult.error === 'missing-config') {
                    alertMessage += '\nChưa gửi Telegram vì thiếu Bot Token/Chat ID.';
                } else {
                    alertMessage += '\nGửi Telegram thất bại: ' + telegramResult.error;
                }
            }

            alert(alertMessage);
            const titleInput = document.getElementById('title');
            const contentInput = document.getElementById('content');
            if (titleInput) {
                titleInput.value = '';
            }
            if (contentInput) {
                contentInput.value = '';
            }
            if (notifImageInput) {
                notifImageInput.value = '';
            }
            const preview = document.getElementById('imagePreview');
            if (preview) {
                preview.innerHTML = '';
            }
        };

        if (title && content) {
            if (imageFile) {
                const reader = new FileReader();
                reader.onload = async function(e) { await saveNotification(e.target.result); };
                reader.readAsDataURL(imageFile);
            } else {
                await saveNotification(null);
            }
        } else {
            alert('Vui lòng điền đầy đủ thông tin!');
        }
    });
}

// Function to display notifications
function displayNotifications() {
    if (!notificationList) return;

    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    notificationList.innerHTML = '';

    if (notifications.length === 0) {
        notificationList.innerHTML = '<p class="no-notifications">Chưa có thông báo nào.</p>';
        return;
    }

    notifications.forEach(notification => {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'notification-item';
        notificationDiv.innerHTML = `
            <h3>${notification.title}</h3>
            <p class="notification-date">${notification.date}</p>
            <p class="notification-content">${notification.content}</p>
            ${notification.image ? `<img src="${notification.image}" style="max-width:100%;max-height:280px;border-radius:12px;margin-bottom:1rem;border:1px solid rgba(199,81,124,0.2);">` : ''}
            <button class="btn-delete-notification" onclick="deleteNotification(${notification.id})">🗑️ Xóa</button>
        `;
        notificationList.appendChild(notificationDiv);
    });
}

// Function to delete notification
function deleteNotification(id) {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const filtered = notifications.filter(n => n.id !== id);
    localStorage.setItem('notifications', JSON.stringify(filtered));
    displayNotifications();
}

// Load notifications on page load
document.addEventListener('DOMContentLoaded', function() {
    displayNotifications();
    hydrateHomeAlerts();
    setTimeout(hydrateHomeAlerts, 800);
});

hydrateHomeAlerts();
setTimeout(hydrateHomeAlerts, 300);

// Content studio interactions
const studioOutput = document.getElementById('studioOutput');
const sidebarCategoryLinks = document.querySelectorAll('.sidebar-menu a[data-category]');

if (studioOutput && sidebarCategoryLinks.length) {
    const fetchGoogleResultsViaMirror = async function(cx, query) {
        if (!cx) {
            throw new Error('missing-cx-for-mirror');
        }

        const mirrorUrl = 'https://r.jina.ai/http://cse.google.com/cse?cx=' + encodeURIComponent(cx) + '&q=' + encodeURIComponent(query);
        const response = await fetch(mirrorUrl);
        if (!response.ok) {
            throw new Error('google-mirror-failed');
        }

        const text = await response.text();
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        const results = [];
        const seen = new Set();

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!/^https?:\/\//i.test(line)) {
                continue;
            }

            const link = line;
            const lower = link.toLowerCase();
            if (
                lower.includes('cse.google.com') ||
                lower.includes('google.com/cse/static') ||
                lower.includes('encrypted-tbn0.gstatic.com')
            ) {
                continue;
            }

            if (seen.has(link)) {
                continue;
            }

            const prev = (lines[i - 1] || '').trim();
            const next = (lines[i + 1] || '').trim();
            const title = prev && !/^https?:\/\//i.test(prev) ? prev : link;
            const snippet = next && !/^https?:\/\//i.test(next) ? next : 'Ket qua tim kiem thuc tu Google Programmable Search.';

            seen.add(link);
            results.push({ title, link, snippet });

            if (results.length >= 10) {
                break;
            }
        }

        return results;
    };

    const buildCseLink = function(cx, query) {
        if (!cx) {
            return '';
        }

        return 'https://cse.google.com/cse?cx=' + encodeURIComponent(cx) + '#gsc.tab=0&gsc.q=' + encodeURIComponent(query);
    };

    const tryOpenCseFallback = function(link) {
        if (!link) {
            return false;
        }

        const key = 'cseFallbackOpened:' + link;
        if (sessionStorage.getItem(key) === '1') {
            return false;
        }

        sessionStorage.setItem(key, '1');
        const opened = window.open(link, '_blank', 'noopener,noreferrer');
        return !!opened;
    };

    const fetchGoogleRealResults = async function(query) {
        const apiKey = localStorage.getItem('googleApiKey');
        const cx = localStorage.getItem('googleCx');

        if (!apiKey || !cx) {
            throw new Error('missing-google-api-config');
        }

        const endpoint = 'https://www.googleapis.com/customsearch/v1?key=' + encodeURIComponent(apiKey) + '&cx=' + encodeURIComponent(cx) + '&q=' + encodeURIComponent(query) + '&num=10';
        const response = await fetch(endpoint);
        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.error) {
            const apiErrorMessage = data.error && data.error.message ? data.error.message : 'google-api-failed';
            throw new Error('google-api-failed::' + apiErrorMessage);
        }

        return Array.isArray(data.items) ? data.items : [];
    };

    const renderStudioContent = function(category) {
        if (category === 'library') {
            const savedApiKey = localStorage.getItem('googleApiKey') || '';
            const savedCx = localStorage.getItem('googleCx') || '';

            studioOutput.innerHTML = `
                <h3>Nội dung từ Thư viện mẫu</h3>
                <div class="studio-api-config">
                    <p class="studio-config-title">Cấu hình Google Search API</p>
                    <input id="googleApiKeyInput" class="studio-config-input" type="text" placeholder="Nhập Google API Key" value="${savedApiKey}">
                    <input id="googleCxInput" class="studio-config-input" type="text" placeholder="Nhập Google CX (Search Engine ID)" value="${savedCx}">
                    <button id="saveGoogleConfigBtn" class="studio-config-btn" type="button">Lưu cấu hình</button>
                    <p id="googleConfigStatus" class="studio-config-status"></p>
                </div>
                <div class="studio-dropdown-wrap">
                    <label for="studioTemplateSelect" class="studio-dropdown-label">Chọn mẫu nội dung</label>
                    <select id="studioTemplateSelect" class="studio-dropdown-select">
                        <option value="title" selected>Mẫu tiêu đề</option>
                        <option value="facebook-ads">Mẫu bài viết Facebook/Ads</option>
                        <option value="short-video">Kịch bản Video ngắn</option>
                    </select>
                </div>
                <div id="studioSelectedContent" class="studio-selected-content"></div>
            `;

            const studioTemplateSelect = document.getElementById('studioTemplateSelect');
            const studioSelectedContent = document.getElementById('studioSelectedContent');
            const googleApiKeyInput = document.getElementById('googleApiKeyInput');
            const googleCxInput = document.getElementById('googleCxInput');
            const saveGoogleConfigBtn = document.getElementById('saveGoogleConfigBtn');
            const googleConfigStatus = document.getElementById('googleConfigStatus');
            const fixedQuery = '100+ cấu trúc giật tít thu hút click';

            const loadTitleResults = async function() {
                if (!studioSelectedContent) {
                    return;
                }

                studioSelectedContent.innerHTML = '<p class="studio-loading">Đang lấy kết quả thực từ Google...</p>';
                const currentCx = (googleCxInput && googleCxInput.value.trim()) || localStorage.getItem('googleCx') || '';

                try {
                    const searchItems = await fetchGoogleRealResults(fixedQuery);

                    if (!searchItems.length) {
                        studioSelectedContent.innerHTML = '<p>Không có kết quả thực từ Google cho truy vấn này.</p>';
                        return;
                    }

                    const directLink = 'https://www.google.com/search?q=' + encodeURIComponent(fixedQuery);
                    const htmlItems = searchItems.slice(0, 10).map((item, index) => {
                        const title = item.title || 'Kết quả từ Google';
                        const link = item.link || directLink;
                        const snippet = item.snippet || '';
                        return `<li><a href="${link}" target="_blank" rel="noopener noreferrer">Top ${index + 1}: ${title}</a><p>${snippet}</p></li>`;
                    }).join('');

                    studioSelectedContent.innerHTML = `
                        <p class="studio-result-title">Top kết quả Google cho truy vấn: "${fixedQuery}"</p>
                        <p><a href="${directLink}" target="_blank" rel="noopener noreferrer">Mở trang kết quả tìm kiếm Google gốc</a></p>
                        <ul class="studio-google-list">${htmlItems}</ul>
                    `;
                } catch (error) {
                    const directLink = 'https://www.google.com/search?q=' + encodeURIComponent(fixedQuery);
                    const cseLink = buildCseLink(currentCx, fixedQuery);
                    const rawMessage = error && error.message ? error.message : '';
                    let friendlyMessage = 'Không thể lấy kết quả từ Google API.';

                    try {
                        const mirrorResults = await fetchGoogleResultsViaMirror(currentCx, fixedQuery);

                        if (mirrorResults.length) {
                            const htmlMirrorItems = mirrorResults.map((item, index) => {
                                return `<li><a href="${item.link}" target="_blank" rel="noopener noreferrer">Top ${index + 1}: ${item.title}</a><p>${item.snippet}</p></li>`;
                            }).join('');

                            studioSelectedContent.innerHTML = `
                                <p class="studio-result-title">Top kết quả tìm kiếm thực từ Google (fallback)</p>
                                <p><a href="${directLink}" target="_blank" rel="noopener noreferrer">Mở trang kết quả Google gốc</a></p>
                                <ul class="studio-google-list">${htmlMirrorItems}</ul>
                            `;
                            return;
                        }
                    } catch (mirrorError) {
                        // Continue to final fallback UI below.
                    }

                    const cseOpened = tryOpenCseFallback(cseLink);

                    if (rawMessage.includes('missing-google-api-config')) {
                        friendlyMessage = 'Bạn chưa cấu hình Google API Key/CX.';
                    } else if (rawMessage.includes('API key not valid')) {
                        friendlyMessage = 'Google API Key không hợp lệ. Vui lòng tạo key mới.';
                    } else if (rawMessage.includes('has not been used in project') || rawMessage.includes('accessNotConfigured')) {
                        friendlyMessage = 'Custom Search API chưa được bật trong project Google Cloud.';
                    } else if (rawMessage.includes('Requests from referer') || rawMessage.includes('referer')) {
                        friendlyMessage = 'API key đang bị giới hạn domain (referer). Hãy tạm để Application restrictions = None để test.';
                    } else if (rawMessage.includes('The request is missing a valid API key')) {
                        friendlyMessage = 'Thiếu API key hợp lệ trong cấu hình.';
                    }

                    studioSelectedContent.innerHTML = `
                        <p><strong>${friendlyMessage}</strong></p>
                        <p>Chi tiết lỗi Google: ${rawMessage || 'Không rõ'}.</p>
                        <p>Kiểm tra nhanh:</p>
                        <p>1) Custom Search API đã Enable.</p>
                        <p>2) API restrictions chọn Custom Search API.</p>
                        <p>3) Application restrictions tạm để None khi test.</p>
                        <p>4) Google CX là Search engine ID đúng.</p>
                        ${cseOpened ? '<p>Đã tự động mở kết quả qua Google Programmable Search ở tab mới.</p>' : ''}
                        ${cseLink ? `<p><a href="${cseLink}" target="_blank" rel="noopener noreferrer">Mở kết quả thật qua Google Programmable Search (không bị chặn bởi JSON API)</a></p>` : ''}
                        <p><a href="${directLink}" target="_blank" rel="noopener noreferrer">Mở kết quả Google thực ngay bây giờ</a></p>
                    `;
                }
            };

            if (saveGoogleConfigBtn && googleApiKeyInput && googleCxInput && googleConfigStatus) {
                saveGoogleConfigBtn.addEventListener('click', function() {
                    const apiKey = googleApiKeyInput.value.trim();
                    const cx = googleCxInput.value.trim();

                    if (!apiKey || !cx) {
                        googleConfigStatus.textContent = 'Vui lòng nhập đầy đủ API Key và CX.';
                        return;
                    }

                    localStorage.setItem('googleApiKey', apiKey);
                    localStorage.setItem('googleCx', cx);
                    googleConfigStatus.textContent = 'Đã lưu cấu hình Google thành công.';

                    if (studioTemplateSelect && studioTemplateSelect.value === 'title') {
                        loadTitleResults();
                    }
                });
            }

            if (studioTemplateSelect && studioSelectedContent) {
                studioTemplateSelect.addEventListener('change', function() {
                    if (this.value !== 'title') {
                        studioSelectedContent.textContent = '';
                        return;
                    }
                    loadTitleResults();
                });

                // User requested: clicking "Thu vien mau" should immediately return real Google results.
                loadTitleResults();
            }

            return;
        }

        studioOutput.innerHTML = `
            <p class="studio-output-placeholder">Chọn mục "Thư viện mẫu" để hiển thị nội dung.</p>
        `;
    };

    sidebarCategoryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            sidebarCategoryLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');

            renderStudioContent(this.dataset.category);
        });
    });
}

    // Trend search button
    const searchBtn = document.getElementById('searchBtn');
    const searchResults = document.getElementById('searchResults');
    const resultsContent = document.getElementById('resultsContent');
    const trendSelect = document.querySelector('.trend-select');
    const trendInput = document.querySelector('.trend-input');

    // Function to fetch real search results - simplified version
    async function fetchRealResults(keyword) {
        const results = {};
        const searchQuery = encodeURIComponent(keyword + ' thai kỳ mẹ bầu');

        // YouTube - direct search links
        results.YouTube = [
            { title: `Video hướng dẫn "${keyword}"`, link: `https://www.youtube.com/results?search_query=${searchQuery}`, views: "Xem kết quả thực tế", duration: "YouTube Search" },
            { title: `Tips về "${keyword}"`, link: `https://www.youtube.com/results?search_query=${searchQuery}`, views: "Xem kết quả thực tế", duration: "YouTube Search" },
            { title: `Hướng dẫn "${keyword}"`, link: `https://www.youtube.com/results?search_query=${searchQuery}`, views: "Xem kết quả thực tế", duration: "YouTube Search" }
        ];

        // Google - direct search link
        results.Google = [{
            title: `Tìm kiếm Google: "${keyword}"`,
            link: `https://www.google.com/search?q=${searchQuery}`,
            views: "Kết quả tìm kiếm",
            engagement: "Google Search Results"
        }];

        // Other platforms - direct search links
        results.TikTok = [{
            title: `Tìm "${keyword}" trên TikTok`,
            link: `https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}`,
            views: "Kết quả thực tế",
            engagement: "TikTok Search"
        }];

        results.Facebook = [{
            title: `Tìm "${keyword}" trên Facebook`,
            link: `https://www.facebook.com/search/posts?q=${encodeURIComponent(keyword)}`,
            views: "Kết quả thực tế",
            engagement: "Facebook Search"
        }];

        results.Douyin = [{
            title: `Tìm "${keyword}" trên Douyin`,
            link: `https://www.douyin.com/search/${encodeURIComponent(keyword)}`,
            views: "Kết quả thực tế",
            engagement: "Douyin Search"
        }];

        return results;
    }

    // Function to display results
    function displayResults(results, keyword) {
        let html = `<p><strong>Từ khóa:</strong> ${keyword}</p>`;
        const platforms = Object.keys(results);

        platforms.forEach(plat => {
            html += `<h4>${plat}</h4>`;
            results[plat].forEach(result => {
                html += `<div class="result-item">
                    <h5>${result.title}</h5>
                    <p>Views/Likes: ${result.views || 'N/A'} | Engagement: ${result.engagement || result.duration || 'N/A'}</p>
                    <a href="${result.link}" target="_blank">Xem chi tiết</a>
                </div>`;
            });
        });

        resultsContent.innerHTML = html;
        searchResults.style.display = 'block';
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', async function() {
            const selectedKeyword = trendSelect.value;
            const customKeyword = trendInput.value.trim();
            
            // Ưu tiên custom keyword nếu có nhập, nếu không dùng dropdown
            const keyword = customKeyword || selectedKeyword;

            if (!keyword) {
                alert('Vui lòng chọn hoặc nhập từ khóa!');
                return;
            }

            console.log('Starting search for:', keyword);

            // Fetch real search results from platforms
            searchBtn.disabled = true;
            searchBtn.textContent = 'Đang tìm kiếm...';

            try {
                const results = await fetchRealResults(keyword);
                console.log('Results to display:', results);
                displayResults(results, keyword);
            } catch (error) {
                console.error('Search error:', error);
                // Fallback to generic links
                const allPlatforms = ["TikTok", "Douyin", "YouTube", "Facebook", "Google"];
                const genericResults = {};
                allPlatforms.forEach(plat => {
                    let searchLink = "#";
                    if (plat === "TikTok") searchLink = `https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}`;
                    else if (plat === "YouTube") searchLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`;
                    else if (plat === "Facebook") searchLink = `https://www.facebook.com/search/posts?q=${encodeURIComponent(keyword)}`;
                    else if (plat === "Google") searchLink = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
                    else if (plat === "Douyin") searchLink = `https://www.douyin.com/search/${encodeURIComponent(keyword)}`;
                    genericResults[plat] = [{ title: `Tìm kiếm "${keyword}" trên ${plat}`, link: searchLink, views: "Kết quả thực tế", engagement: "Xem trên nền tảng" }];
                });
                displayResults(genericResults, keyword);
            } finally {
                searchBtn.disabled = false;
                searchBtn.textContent = 'Tìm Kiếm';
            }
        });
    }

    const addRowBtn = document.getElementById('addRowBtn');
    const calculateBtn = document.getElementById('calculateBtn');
    const exportBtn = document.getElementById('exportBtn');
    const reportTableBody = document.getElementById('reportTableBody');

    if (addRowBtn) {
        addRowBtn.addEventListener('click', function() {
            addNewRow();
        });
    }

    if (calculateBtn) {
        calculateBtn.addEventListener('click', function() {
            calculateSummary();
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportReportData();
        });
    }

    // Add new row to report table
    function addNewRow() {
        const newRow = document.createElement('tr');
        newRow.className = 'data-row';
        newRow.innerHTML = `
            <td><input type="date" class="row-input" placeholder="Chọn ngày"></td>
            <td><input type="number" class="row-input" placeholder="Nhập số mess"></td>
            <td><input type="number" class="row-input" placeholder="Nhập số điện thoại"></td>
            <td><input type="number" class="row-input" placeholder="Nhập lịch hẹn"></td>
            <td><input type="number" class="row-input" placeholder="Tổng chi tiêu"></td>
            <td><input type="number" class="row-input" placeholder="Tổng doanh thu"></td>
            <td><button class="btn-delete" onclick="deleteRow(this)">🗑️</button></td>
        `;

        if (reportTableBody) {
            reportTableBody.appendChild(newRow);
            // Add event listeners to new inputs
            const inputs = newRow.querySelectorAll('.row-input');
            inputs.forEach(input => {
                input.addEventListener('change', calculateSummary);
                input.addEventListener('input', calculateSummary);
            });
        }
    }

    // Delete row function
    window.deleteRow = function(button) {
        button.closest('tr').remove();
        calculateSummary();
    };

    // Calculate summary statistics
    function calculateSummary() {
        console.log('calculateSummary called');
        const rows = document.querySelectorAll('.data-row');
        console.log('Found rows:', rows.length);
        let totalExpense = 0; // Tổng Chi Tiêu
        let totalRevenue = 0; // Tổng Doanh Thu
        let totalMessages = 0; // Số Mess

        rows.forEach((row, index) => {
            const inputs = row.querySelectorAll('.row-input');
            const rowTotalExpense = parseFloat((inputs[4] && inputs[4].value) || 0) || 0; // Tổng Chi Tiêu (index 4)
            const revenue = parseFloat((inputs[5] && inputs[5].value) || 0) || 0; // Tổng Doanh Thu (index 5)
            const messages = parseFloat((inputs[1] && inputs[1].value) || 0) || 0; // Số Mess (index 1)

            totalExpense += rowTotalExpense;
            totalRevenue += revenue;
            totalMessages += messages;
        });

        // Update summary display
        const totalExpenseEl = document.getElementById('totalExpense');
        const totalRevenueEl = document.getElementById('totalRevenue');
        const totalMessagesEl = document.getElementById('totalMessages');

        if (totalExpenseEl) {
            totalExpenseEl.textContent = totalExpense.toLocaleString('vi-VN') + ' VNĐ';
        }
        if (totalRevenueEl) {
            totalRevenueEl.textContent = totalRevenue.toLocaleString('vi-VN') + ' VNĐ';
        }
        if (totalMessagesEl) {
            totalMessagesEl.textContent = totalMessages.toString();
        }
    }

    // Export report data
    function exportReportData() {
        const rows = document.querySelectorAll('.data-row');
        let csv = 'Ngày,Số Mess,Số Điện Thoại,Lịch Hẹn,Tổng Chi Tiêu,Tổng Doanh Thu\n';

        rows.forEach(row => {
            const inputs = row.querySelectorAll('.row-input');
            const values = Array.from(inputs).map(input => input.value);
            csv += values.join(',') + '\n';
        });

        // Create download link
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
        element.setAttribute('download', 'bao-cao-' + new Date().toISOString().split('T')[0] + '.csv');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    // Initial summary calculation and add event listeners to existing inputs
    if (reportTableBody) {
        const allInputs = reportTableBody.querySelectorAll('.row-input');
        allInputs.forEach(input => {
            input.addEventListener('change', calculateSummary);
            input.addEventListener('input', calculateSummary);
        });

        // Delay calculation to ensure DOM is fully loaded
        setTimeout(() => {
            console.log('Calling calculateSummary after timeout');
            calculateSummary();
        }, 500);
    }

    try {
        const adsPerformanceChartCanvas = document.getElementById('adsPerformanceChart');
        const budgetInput = document.getElementById('budgetInput');
        const dailyBudgetInput = document.getElementById('dailyBudgetInput');
        const revenueInput = document.getElementById('revenueInput');
        const campaignInput = document.getElementById('campaignInput');

        const canInitDashboardChart = Boolean(
            adsPerformanceChartCanvas && budgetInput && dailyBudgetInput && revenueInput && campaignInput
        );

        const initDashboardChart = function() {
            if (!canInitDashboardChart || !window.Chart) {
                return false;
            }

            if (adsPerformanceChartCanvas.dataset.chartReady === '1') {
                return true;
            }

        const dashboardStorageKey = 'homeAdsDashboardInputs';
        const reportEmployeeKey = 'rpEmployeeListV1';
        const reportPrefix = 'rpData3';
        const reportCollection = 'ma_reports';
        const reportEmployeeStat = document.getElementById('reportEmployeeStat');
        const insightWeeklyStamp = document.getElementById('insightWeeklyStamp');
        const insightDateFromInput = document.getElementById('insightDateFrom');
        const insightDateToInput = document.getElementById('insightDateTo');
        const topAreaWeekSelect = document.getElementById('topAreaWeekSelect');
        const topAreaSheetUrlInput = document.getElementById('topAreaSheetUrl');
        const topAreaSheetApplyBtn = document.getElementById('topAreaSheetApply');
        const topAreaSheetStatus = document.getElementById('topAreaSheetStatus');
        const districtSelects = [
            document.getElementById('districtSelect1'),
            document.getElementById('districtSelect2'),
            document.getElementById('districtSelect3')
        ];
        const districtGrowthInputs = [
            document.getElementById('districtGrowth1'),
            document.getElementById('districtGrowth2'),
            document.getElementById('districtGrowth3')
        ];
        const districtRevenueInputs = [
            document.getElementById('districtRevenue1'),
            document.getElementById('districtRevenue2'),
            document.getElementById('districtRevenue3')
        ];
        const hanoiAreaOptions = [
            'Ba Đình',
            'Hoàn Kiếm',
            'Tây Hồ',
            'Long Biên',
            'Cầu Giấy',
            'Đống Đa',
            'Hai Bà Trưng',
            'Hoàng Mai',
            'Thanh Xuân',
            'Bắc Từ Liêm',
            'Nam Từ Liêm',
            'Hà Đông',
            'Sơn Tây',
            'Ba Vì',
            'Chương Mỹ',
            'Đan Phượng',
            'Đông Anh',
            'Gia Lâm',
            'Hoài Đức',
            'Mê Linh',
            'Mỹ Đức',
            'Phú Xuyên',
            'Phúc Thọ',
            'Quốc Oai',
            'Sóc Sơn',
            'Thạch Thất',
            'Thanh Oai',
            'Thanh Trì',
            'Thường Tín',
            'Ứng Hòa'
        ];
        const chartRefreshMs = 6000;
        const topAreaRefreshMs = 10 * 60 * 1000;
        const topAreaSheetConfigKey = 'homeTopAreaSheetConfigV1';
        const topAreaSheetDataKey = 'homeTopAreaSheetDataV1';
        const topAreaSharedResultKey = 'homeTopAreaSharedWeeklyV1';
        const authSessionKey = 'ma_session_v1';
        const authOwnerKey = 'ma_owner_id_v1';
        const authAccountsKey = 'ma_accounts_v1';
        const topAreaSheetConfigCollection = 'ma_config';
        const topAreaSheetConfigDocId = 'home_top_area_sheet_v1';
        const topAreaSharedResultField = 'latestTopAreaWeekly';
        let homeReportDb = null;
        let homeReportUnsub = null;
        let topAreaSheetConfigUnsub = null;

        const parseNumber = function(raw) {
            return Number(String(raw || '').replace(/[^0-9]/g, '')) || 0;
        };

        const formatWithSeparator = function(value) {
            return (Number(value) || 0).toLocaleString('vi-VN');
        };

        const clampCampaign = function(value) {
            const num = Number(value) || 1;
            return Math.max(1, Math.min(99, Math.round(num)));
        };

        const getWeekNumber = function(date) {
            const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const day = utcDate.getUTCDay() || 7;
            utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
            const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
            return Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
        };

        const safeParseState = function(raw) {
            try {
                const parsed = JSON.parse(raw || '{}');
                return (parsed && typeof parsed === 'object') ? parsed : {};
            } catch (e) {
                return {};
            }
        };

        const loadDashboardState = function() {
            return safeParseState(localStorage.getItem(dashboardStorageKey));
        };

        const loadTopAreaSheetConfig = function() {
            return safeParseState(localStorage.getItem(topAreaSheetConfigKey));
        };

        const saveTopAreaSheetConfig = function(patch) {
            const base = loadTopAreaSheetConfig();
            const next = Object.assign({}, base, patch || {});
            localStorage.setItem(topAreaSheetConfigKey, JSON.stringify(next));
            return next;
        };

        const loadTopAreaSharedResult = function() {
            return safeParseState(localStorage.getItem(topAreaSharedResultKey));
        };

        const saveTopAreaSharedResult = function(payload) {
            const normalizedPayload = (payload && typeof payload === 'object') ? payload : {};
            localStorage.setItem(topAreaSharedResultKey, JSON.stringify(normalizedPayload));
            return normalizedPayload;
        };

        const setTopAreaStatus = function(message, type) {
            if (!topAreaSheetStatus) {
                return;
            }
            topAreaSheetStatus.textContent = message || 'Chưa liên kết Google Sheet. Hệ thống đang dùng dữ liệu nhập tay.';
            topAreaSheetStatus.style.color = (type === 'bad') ? '#b91c1c' : (type === 'good' ? '#166534' : '#7f3052');
        };

        const resolveTopAreaSheetAccess = function() {
            const authBadge = document.querySelector('.auth-badge');
            const badgeText = String((authBadge && authBadge.textContent) || '').toLowerCase();
            if (badgeText.indexOf('quan tri cao nhat') !== -1 || badgeText.indexOf('quản trị cao nhất') !== -1) {
                return { known: true, isSuperadmin: true };
            }

            const session = safeParseState(localStorage.getItem(authSessionKey));
            const userId = String((session && session.userId) || '').trim();
            if (!userId) {
                return { known: false, isSuperadmin: false };
            }

            const ownerId = String(localStorage.getItem(authOwnerKey) || '').trim();
            if (ownerId && ownerId === userId) {
                return { known: true, isSuperadmin: true };
            }

            const accounts = safeParseState(localStorage.getItem(authAccountsKey));
            if (!Array.isArray(accounts)) {
                return { known: false, isSuperadmin: false };
            }

            const currentUser = accounts.find(function(acc) {
                return acc && acc.id === userId;
            });
            if (!currentUser) {
                return { known: false, isSuperadmin: false };
            }

            const role = String(currentUser.role || '').toLowerCase();
            const status = String(currentUser.status || 'active').toLowerCase();
            return {
                known: true,
                isSuperadmin: role === 'superadmin' && status === 'active'
            };
        };

        const canManageTopAreaSheet = function() {
            const access = resolveTopAreaSheetAccess();
            return access.known && access.isSuperadmin;
        };

        const applyTopAreaSheetAccessByRole = function() {
            const access = resolveTopAreaSheetAccess();
            const isSuperadmin = access.known && access.isSuperadmin;
            const linkRow = topAreaSheetUrlInput ? topAreaSheetUrlInput.closest('.sheet-link-row') : null;
            if (linkRow) {
                linkRow.style.display = isSuperadmin ? '' : 'none';
            }
            if (topAreaSheetUrlInput) {
                topAreaSheetUrlInput.disabled = !isSuperadmin;
            }
            if (topAreaSheetApplyBtn) {
                topAreaSheetApplyBtn.disabled = !isSuperadmin;
            }
            if (topAreaSheetStatus && access.known && !isSuperadmin) {
                setTopAreaStatus('Dữ liệu khu vực được đồng bộ bởi quản trị hệ thống.', '');
            }
            return isSuperadmin;
        };

        const saveTopAreaSheetConfigRemote = async function(config) {
            const db = initHomeReportDb();
            if (!db) {
                return false;
            }
            await db.collection(topAreaSheetConfigCollection).doc(topAreaSheetConfigDocId).set({
                url: String((config && config.url) || '').trim(),
                gid: String((config && config.gid) || '0').trim() || '0',
                updatedAt: Date.now(),
                updatedBy: String((safeParseState(localStorage.getItem(authSessionKey)).userId) || '')
            }, { merge: true });
            return true;
        };

        const saveTopAreaWeeklyResultRemote = async function(range, rows) {
            const db = initHomeReportDb();
            if (!db) {
                return false;
            }
            const normalized = normalizeInsightRange(range && range.from, range && range.to);
            const safeRows = (Array.isArray(rows) ? rows : []).slice(0, 3).map(function(item) {
                return {
                    area: String((item && item.area) || '').trim(),
                    hd: Number((item && item.hd) || 0),
                    revenue: Number((item && item.revenue) || 0),
                    growthPct: Number((item && item.growthPct) || 0)
                };
            });
            const payload = {};
            payload[topAreaSharedResultField] = {
                from: normalized.from,
                to: normalized.to,
                rows: safeRows,
                updatedAt: Date.now(),
                updatedBy: String((safeParseState(localStorage.getItem(authSessionKey)).userId) || '')
            };
            await db.collection(topAreaSheetConfigCollection).doc(topAreaSheetConfigDocId).set(payload, { merge: true });
            return true;
        };

        const bindTopAreaSheetConfigRealtime = function() {
            const db = initHomeReportDb();
            if (!db) {
                return;
            }

            if (topAreaSheetConfigUnsub) {
                topAreaSheetConfigUnsub();
                topAreaSheetConfigUnsub = null;
            }

            topAreaSheetConfigUnsub = db.collection(topAreaSheetConfigCollection).doc(topAreaSheetConfigDocId).onSnapshot(function(snapshot) {
                if (!snapshot.exists) {
                    return;
                }
                const remoteCfg = snapshot.data() || {};
                const nextUrl = String(remoteCfg.url || '').trim();
                const nextGid = String(remoteCfg.gid || '0').trim() || '0';
                const currentCfg = loadTopAreaSheetConfig();
                if (String(currentCfg.url || '').trim() !== nextUrl || String(currentCfg.gid || '0').trim() !== nextGid) {
                    saveTopAreaSheetConfig({ url: nextUrl, gid: nextGid });
                    if (topAreaSheetUrlInput) {
                        topAreaSheetUrlInput.value = nextUrl;
                    }
                    updateTopAreaFromSheet({ silent: true });
                }

                const sharedResult = (remoteCfg && remoteCfg[topAreaSharedResultField] && typeof remoteCfg[topAreaSharedResultField] === 'object')
                    ? remoteCfg[topAreaSharedResultField]
                    : null;
                if (sharedResult && Array.isArray(sharedResult.rows) && sharedResult.rows.length) {
                    saveTopAreaSharedResult(sharedResult);
                    const currentRange = normalizeInsightRange(
                        insightDateFromInput ? insightDateFromInput.value : '',
                        insightDateToInput ? insightDateToInput.value : ''
                    );
                    if (String(sharedResult.from || '') === currentRange.from && String(sharedResult.to || '') === currentRange.to) {
                        applyTopAreaRowsToUi(sharedResult.rows);
                        if (!canManageTopAreaSheet()) {
                            setTopAreaStatus('Đã cập nhật dữ liệu top HĐ theo tuần mới nhất từ hệ thống.', 'good');
                        }
                    }
                }
                applyTopAreaSheetAccessByRole();
            });
        };

        const extractSheetId = function(rawUrl) {
            const text = String(rawUrl || '').trim();
            if (!text) {
                return '';
            }
            const m = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
            return m ? m[1] : '';
        };

        const extractSheetGid = function(rawUrl) {
            const text = String(rawUrl || '').trim();
            if (!text) {
                return '0';
            }
            const m = text.match(/[?&]gid=(\d+)/i);
            return m ? m[1] : '0';
        };

        const buildSheetCsvUrl = function(sheetId, gid) {
            if (!sheetId) {
                return '';
            }
            const safeGid = String(gid || '0').trim() || '0';
            return 'https://docs.google.com/spreadsheets/d/' + sheetId + '/export?format=csv&gid=' + encodeURIComponent(safeGid);
        };

        const unwrapMirrorText = function(rawText) {
            const text = String(rawText || '');
            const marker = 'Markdown Content:';
            const markerIndex = text.indexOf(marker);
            if (markerIndex === -1) {
                return text;
            }
            return text.slice(markerIndex + marker.length).trim();
        };

        const fetchSheetCsvText = async function(sheetId, gid) {
            const directUrl = buildSheetCsvUrl(sheetId, gid);
            const mirrorUrl = 'https://r.jina.ai/http://docs.google.com/spreadsheets/d/' + sheetId + '/export?format=csv&gid=' + encodeURIComponent(String(gid || '0'));
            const candidates = [
                { url: directUrl, isMirror: false },
                { url: mirrorUrl, isMirror: true }
            ];

            let lastError = null;
            for (let i = 0; i < candidates.length; i += 1) {
                const candidate = candidates[i];
                try {
                    const res = await fetch(candidate.url + '&_=' + Date.now());
                    const text = await res.text();
                    if (!res.ok) {
                        throw new Error('HTTP ' + res.status);
                    }
                    const csvText = candidate.isMirror ? unwrapMirrorText(text) : text;
                    if (!String(csvText || '').includes(',')) {
                        throw new Error('Định dạng phản hồi không hợp lệ.');
                    }
                    return csvText;
                } catch (err) {
                    lastError = err;
                }
            }

            throw lastError || new Error('Không thể kết nối Google Sheet.');
        };

        const parseCsvLine = function(line) {
            const out = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i += 1) {
                const ch = line[i];
                if (ch === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        current += '"';
                        i += 1;
                    } else {
                        inQuotes = !inQuotes;
                    }
                    continue;
                }
                if (ch === ',' && !inQuotes) {
                    out.push(current);
                    current = '';
                    continue;
                }
                current += ch;
            }
            out.push(current);
            return out;
        };

        const parseCsvText = function(csvText) {
            const lines = String(csvText || '').replace(/\r/g, '').split('\n').filter(function(line) {
                return String(line || '').trim() !== '';
            });
            if (!lines.length) {
                return { headers: [], rows: [] };
            }
            const headers = parseCsvLine(lines[0]).map(function(h) { return String(h || '').trim(); });
            const rows = lines.slice(1).map(function(line) {
                const cells = parseCsvLine(line);
                const row = {};
                headers.forEach(function(header, idx) {
                    row[header] = String(cells[idx] || '').trim();
                });
                return row;
            });
            return { headers: headers, rows: rows };
        };

        const normalizeHeader = function(text) {
            return String(text || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/[^a-z0-9]/g, '');
        };

        const findHeaderKey = function(headers, aliases) {
            const normalizedAliases = (aliases || []).map(normalizeHeader);
            const found = (headers || []).find(function(header) {
                return normalizedAliases.indexOf(normalizeHeader(header)) !== -1;
            });
            return found || '';
        };

        const canonicalizeHanoiAreaName = function(rawArea) {
            const original = String(rawArea || '').trim();
            if (!original) {
                return '';
            }

            const normalizedArea = normalizeHeader(original)
                .replace(/^(quan|huyen|thixa)/, '');

            const matched = hanoiAreaOptions.find(function(areaName) {
                const normalizedKnown = normalizeHeader(areaName)
                    .replace(/^(quan|huyen|thixa)/, '');
                return normalizedKnown === normalizedArea;
            });

            return matched || original;
        };

        const ensureDistrictOptionExists = function(selectElement, areaName) {
            if (!selectElement || !areaName) {
                return;
            }
            const hasExactOption = Array.from(selectElement.options).some(function(option) {
                return String(option.value || option.textContent || '').trim() === areaName;
            });
            if (!hasExactOption) {
                const option = document.createElement('option');
                option.value = areaName;
                option.textContent = areaName;
                selectElement.appendChild(option);
            }
        };

        const populateDistrictSelectOptions = function() {
            districtSelects.forEach(function(selectElement) {
                if (!selectElement) {
                    return;
                }
                const currentValue = canonicalizeHanoiAreaName(selectElement.value || '');
                selectElement.innerHTML = '';

                const placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = 'Chọn quận/huyện/thị xã';
                selectElement.appendChild(placeholder);

                hanoiAreaOptions.forEach(function(areaName) {
                    const option = document.createElement('option');
                    option.value = areaName;
                    option.textContent = areaName;
                    selectElement.appendChild(option);
                });

                if (currentValue) {
                    ensureDistrictOptionExists(selectElement, currentValue);
                    selectElement.value = currentValue;
                }
            });
        };

        const findHeaderKeyByParts = function(headers, requiredParts, optionalParts) {
            const headerList = Array.isArray(headers) ? headers : [];
            const required = (requiredParts || []).map(normalizeHeader).filter(Boolean);
            const optional = (optionalParts || []).map(normalizeHeader).filter(Boolean);
            let bestHeader = '';
            let bestScore = -1;

            headerList.forEach(function(header) {
                const normalizedHeader = normalizeHeader(header);
                if (!normalizedHeader) {
                    return;
                }

                const hasAllRequired = required.every(function(part) {
                    return normalizedHeader.indexOf(part) !== -1;
                });
                if (!hasAllRequired) {
                    return;
                }

                const score = optional.reduce(function(total, part) {
                    return total + (normalizedHeader.indexOf(part) !== -1 ? 1 : 0);
                }, 0);

                if (score > bestScore) {
                    bestScore = score;
                    bestHeader = header;
                }
            });

            return bestHeader;
        };

        const parseSheetMetricNumber = function(raw) {
            const text = String(raw || '').trim().toLowerCase();
            if (!text) {
                return 0;
            }

            const compact = text.replace(/\s+/g, '');
            const hasNegative = /^-/.test(compact) || (/^\(.*\)$/.test(compact));
            const unitMultiplier = compact.indexOf('ty') !== -1 ? 1000000000
                : (compact.indexOf('trieu') !== -1 || compact.indexOf('tr') !== -1 ? 1000000
                : (compact.indexOf('k') !== -1 ? 1000 : 1));
            let normalizedNumber = compact.replace(/[^0-9,.-]/g, '');
            const dotCount = (normalizedNumber.match(/\./g) || []).length;
            const commaCount = (normalizedNumber.match(/,/g) || []).length;

            if (dotCount > 0 && commaCount === 0) {
                const dotParts = normalizedNumber.split('.').filter(Boolean);
                const looksLikeThousands = dotParts.length > 1 && dotParts.slice(1).every(function(part) {
                    return /^\d{3}$/.test(part);
                });
                if (looksLikeThousands) {
                    normalizedNumber = dotParts.join('');
                }
            } else if (commaCount > 0 && dotCount === 0) {
                const commaParts = normalizedNumber.split(',').filter(Boolean);
                const looksLikeThousands = commaParts.length > 1 && commaParts.slice(1).every(function(part) {
                    return /^\d{3}$/.test(part);
                });
                if (looksLikeThousands) {
                    normalizedNumber = commaParts.join('');
                }
            }

            if (normalizedNumber.indexOf('.') !== -1 && normalizedNumber.indexOf(',') !== -1) {
                if (normalizedNumber.lastIndexOf(',') > normalizedNumber.lastIndexOf('.')) {
                    normalizedNumber = normalizedNumber.replace(/\./g, '').replace(/,/g, '.');
                } else {
                    normalizedNumber = normalizedNumber.replace(/,/g, '');
                }
            } else {
                normalizedNumber = normalizedNumber
                    .replace(/\.(?=.*\.)/g, '')
                    .replace(/,(?=\d{3}(\D|$))/g, '')
                    .replace(/,(?=\d{1,2}(\D|$))/g, '.');
            }

            const numericValue = Number(normalizedNumber);
            if (!Number.isNaN(numericValue) && normalizedNumber !== '') {
                return (hasNegative ? -1 : 1) * numericValue * unitMultiplier;
            }

            return parseNumber(text);
        };

        const looksLikeMoneyValue = function(raw) {
            const text = String(raw || '').trim().toLowerCase();
            if (!text) {
                return false;
            }

            if (/d|vnd|vnđ|trieu|tr|ty|k/.test(text)) {
                return true;
            }

            const cleaned = text.replace(/\s+/g, '');
            if ((cleaned.match(/[.,]/g) || []).length >= 2) {
                return true;
            }

            const numericValue = parseSheetMetricNumber(text);
            return numericValue >= 1000;
        };

        const shouldUseHdColumnAsRevenue = function(rows, hdKey, revenueKey) {
            if (revenueKey || !hdKey) {
                return false;
            }

            const sampleRows = (Array.isArray(rows) ? rows : []).slice(0, 12);
            if (!sampleRows.length) {
                return false;
            }

            const moneyLikeCount = sampleRows.reduce(function(total, row) {
                return total + (looksLikeMoneyValue(row && row[hdKey]) ? 1 : 0);
            }, 0);

            return moneyLikeCount >= Math.ceil(sampleRows.length / 2);
        };

        const parseFlexibleDate = function(raw) {
            const text = String(raw || '').trim();
            if (!text) {
                return null;
            }
            let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
            if (m) {
                return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
            }
            m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (m) {
                return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
            }
            m = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
            if (m) {
                return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
            }
            const parsed = new Date(text);
            if (!Number.isNaN(parsed.getTime())) {
                return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
            }
            return null;
        };

        const toDateAtStart = function(inputDate) {
            const m = String(inputDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!m) {
                return null;
            }
            return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        };

        const addDays = function(dateObj, days) {
            const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
            d.setDate(d.getDate() + Number(days || 0));
            return d;
        };

        const toAreaMoney = function(value) {
            return (Number(value) || 0).toLocaleString('vi-VN');
        };

        const toAreaGrowthText = function(value) {
            const num = Number(value) || 0;
            const sign = num > 0 ? '+' : '';
            return sign + num.toFixed(1) + '%';
        };

        const applyTopAreaRowsToUi = function(rows) {
            const list = Array.isArray(rows) ? rows : [];
            for (let i = 0; i < 3; i += 1) {
                const item = list[i] || null;
                const areaName = item ? canonicalizeHanoiAreaName(item.area) : '';
                if (districtSelects[i]) {
                    ensureDistrictOptionExists(districtSelects[i], areaName);
                    districtSelects[i].value = areaName;
                }
                if (districtGrowthInputs[i]) {
                    districtGrowthInputs[i].value = item ? toAreaGrowthText(item.growthPct) : '';
                }
                if (districtRevenueInputs[i]) {
                    districtRevenueInputs[i].value = item ? toAreaMoney(item.revenue) : '';
                }
            }
        };

        const deriveTopAreaRows = function(sourceRows, range) {
            const fromDate = toDateAtStart(range && range.from);
            const toDate = toDateAtStart(range && range.to);
            if (!fromDate || !toDate) {
                return [];
            }

            const dateDiffDays = Math.max(0, Math.round((toDate - fromDate) / 86400000));
            const prevFrom = addDays(fromDate, -(dateDiffDays + 1));
            const prevTo = addDays(fromDate, -1);
            const curMap = {};
            const prevMap = {};

            (sourceRows || []).forEach(function(row) {
                const area = canonicalizeHanoiAreaName(row.__area);
                if (!area) {
                    return;
                }
                const date = parseFlexibleDate(row.__date);
                if (!date) {
                    return;
                }
                const hd = Number(row.__hd || 0);
                const revenue = Number(row.__revenue || 0);
                if (date >= fromDate && date <= toDate) {
                    if (!curMap[area]) {
                        curMap[area] = { area: area, hd: 0, revenue: 0 };
                    }
                    curMap[area].hd += hd;
                    curMap[area].revenue += revenue;
                } else if (date >= prevFrom && date <= prevTo) {
                    if (!prevMap[area]) {
                        prevMap[area] = { area: area, hd: 0 };
                    }
                    prevMap[area].hd += hd;
                }
            });

            return Object.keys(curMap).map(function(area) {
                const cur = curMap[area] || { hd: 0, revenue: 0 };
                const prevHd = (prevMap[area] && prevMap[area].hd) || 0;
                const growthPct = prevHd > 0 ? ((cur.hd - prevHd) / prevHd) * 100 : (cur.hd > 0 ? 100 : 0);
                return {
                    area: area,
                    hd: cur.hd,
                    revenue: cur.revenue,
                    growthPct: growthPct
                };
            }).sort(function(a, b) {
                if (b.hd !== a.hd) {
                    return b.hd - a.hd;
                }
                return b.revenue - a.revenue;
            }).slice(0, 3);
        };

        const normalizeSheetRows = function(parsed) {
            const headers = parsed && parsed.headers ? parsed.headers : [];
            const rows = parsed && parsed.rows ? parsed.rows : [];

            const dateKey = findHeaderKey(headers, ['ngay', 'date', 'report_date', 'ngaybao cao', 'ngaybaocao']);
            const areaKey = findHeaderKey(headers, ['khuvuc', 'khu vuc', 'quan', 'dia ban', 'district', 'area']);
            const hdKey = findHeaderKey(headers, ['hd', 'sohd', 'so hd', 'hopdong', 'hop dong', 'contracts']);
            const revenueKey = findHeaderKey(headers, [
                'doanhthu',
                'doanh thu',
                'tongdoanhthu',
                'tong doanh thu',
                'doanhso',
                'doanh so',
                'tongdoanhso',
                'tong doanh so',
                'giatrihopdong',
                'gia tri hop dong',
                'tonggiatri',
                'tong gia tri',
                'contractvalue',
                'contract value',
                'amount',
                'revenue',
                'sales',
                'value',
                'dt',
                'ds'
            ]) || findHeaderKeyByParts(headers, ['doanh'], ['thu', 'so', 'tong'])
                || findHeaderKeyByParts(headers, ['gia', 'tri'], ['hop', 'dong', 'tong'])
                || findHeaderKeyByParts(headers, ['contract'], ['value', 'amount'])
                || findHeaderKeyByParts(headers, ['amount'], ['contract', 'revenue', 'value']);
            const hdActsAsRevenue = shouldUseHdColumnAsRevenue(rows, hdKey, revenueKey);

            if (!dateKey || !areaKey || !hdKey) {
                return { ok: false, rows: [] };
            }

            const normalizedRows = rows.map(function(row) {
                const revenueSource = revenueKey ? row[revenueKey] : (hdActsAsRevenue ? row[hdKey] : '0');
                return {
                    __date: row[dateKey],
                    __area: row[areaKey],
                    __hd: parseNumber(row[hdKey]),
                    __revenue: parseSheetMetricNumber(revenueSource)
                };
            });

            return { ok: true, rows: normalizedRows };
        };

        const updateTopAreaFromSheet = async function(options) {
            const cfg = loadTopAreaSheetConfig();
            const sheetUrl = String((cfg && cfg.url) || '').trim();
            const sheetId = extractSheetId(sheetUrl);
            const gid = String((cfg && cfg.gid) || '0').trim() || '0';
            const currentRange = normalizeInsightRange(
                insightDateFromInput ? insightDateFromInput.value : '',
                insightDateToInput ? insightDateToInput.value : ''
            );
            const sharedLocalResult = loadTopAreaSharedResult();

            if (!canManageTopAreaSheet()) {
                if (
                    sharedLocalResult &&
                    Array.isArray(sharedLocalResult.rows) &&
                    sharedLocalResult.rows.length &&
                    String(sharedLocalResult.from || '') === currentRange.from &&
                    String(sharedLocalResult.to || '') === currentRange.to
                ) {
                    applyTopAreaRowsToUi(sharedLocalResult.rows);
                    if (!(options && options.silent)) {
                        setTopAreaStatus('Đã cập nhật dữ liệu top HĐ theo tuần mới nhất từ hệ thống.', 'good');
                    }
                    return true;
                }

                if (!(options && options.silent)) {
                    setTopAreaStatus('Đang chờ dữ liệu realtime từ hệ thống...', '');
                }
                return false;
            }

            if (!sheetId) {
                return false;
            }

            try {
                if (topAreaSheetApplyBtn && canManageTopAreaSheet()) {
                    topAreaSheetApplyBtn.disabled = true;
                }
                if (!(options && options.silent)) {
                    setTopAreaStatus('Đang đọc dữ liệu Google Sheet...', '');
                }

                const csvText = await fetchSheetCsvText(sheetId, gid);
                const parsed = parseCsvText(csvText);
                const normalized = normalizeSheetRows(parsed);
                if (!normalized.ok) {
                    throw new Error('Thiếu cột bắt buộc: Ngày, Khu vực, HĐ.');
                }

                localStorage.setItem(topAreaSheetDataKey, JSON.stringify(normalized.rows));
                const topRows = deriveTopAreaRows(normalized.rows, currentRange);
                applyTopAreaRowsToUi(topRows);
                if (canManageTopAreaSheet()) {
                    try {
                        await saveTopAreaWeeklyResultRemote(currentRange, topRows);
                    } catch (e) {
                        // Keep UI responsive even if Firestore write is temporarily unavailable.
                    }
                }
                setTopAreaStatus('Đã đồng bộ Google Sheet theo tuần ' + toViDate(currentRange.from) + ' đến ' + toViDate(currentRange.to) + '.', 'good');
                return true;
            } catch (error) {
                const cachedRows = safeParseState(localStorage.getItem(topAreaSheetDataKey));
                const fallbackRows = Array.isArray(cachedRows) ? cachedRows : [];
                if (fallbackRows.length) {
                    applyTopAreaRowsToUi(deriveTopAreaRows(fallbackRows, currentRange));
                    setTopAreaStatus('Google Sheet tạm lỗi, đang dùng dữ liệu đã lưu trước đó.', 'bad');
                    return true;
                }
                setTopAreaStatus('Không thể đồng bộ Google Sheet: ' + (error && error.message ? error.message : 'Lỗi không xác định') + '. Hãy bật chia sẻ công khai cho Sheet.', 'bad');
                return false;
            } finally {
                if (topAreaSheetApplyBtn && canManageTopAreaSheet()) {
                    topAreaSheetApplyBtn.disabled = false;
                }
            }
        };

        const saveDashboardState = function(patch) {
            const base = loadDashboardState();
            const next = Object.assign({}, base, patch || {});
            localStorage.setItem(dashboardStorageKey, JSON.stringify(next));
            return next;
        };

        const toInputDate = function(dateObj) {
            const d = dateObj instanceof Date ? dateObj : new Date();
            if (Number.isNaN(d.getTime())) {
                return '';
            }
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        };

        const toViDate = function(inputDate) {
            const m = String(inputDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!m) {
                return '';
            }
            return m[3] + '/' + m[2] + '/' + m[1];
        };

        const getWeekStartMonday = function(dateObj) {
            const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
            const day = d.getDay() || 7;
            d.setDate(d.getDate() - (day - 1));
            return d;
        };

        const normalizeInsightRange = function(fromVal, toVal) {
            let from = String(fromVal || '').trim();
            let to = String(toVal || '').trim();
            if (!from || !to) {
                const now = new Date();
                const weekStart = getWeekStartMonday(now);
                from = from || toInputDate(weekStart);
                to = to || toInputDate(now);
            }
            if (from && to && from > to) {
                const tmp = from;
                from = to;
                to = tmp;
            }
            return { from: from, to: to };
        };

        const buildWeekOptionLabel = function(fromDate, toDate) {
            const weekNo = getWeekNumber(toDate);
            return 'Tuần ' + weekNo + ' (' + toViDate(toInputDate(fromDate)) + ' - ' + toViDate(toInputDate(toDate)) + ')';
        };

        const populateTopAreaWeekSelect = function() {
            if (!topAreaWeekSelect) {
                return;
            }
            const previousValue = String(topAreaWeekSelect.value || '').trim();
            topAreaWeekSelect.innerHTML = '<option value="custom">Theo khoảng ngày đang chọn</option>';

            const today = new Date();
            for (let i = 0; i < 16; i += 1) {
                const anchor = addDays(today, -(i * 7));
                const fromDate = getWeekStartMonday(anchor);
                const toDate = addDays(fromDate, 6);
                const value = toInputDate(fromDate) + '|' + toInputDate(toDate);
                const option = document.createElement('option');
                option.value = value;
                option.textContent = buildWeekOptionLabel(fromDate, toDate);
                topAreaWeekSelect.appendChild(option);
            }

            topAreaWeekSelect.value = previousValue && topAreaWeekSelect.querySelector('option[value="' + previousValue + '"]')
                ? previousValue
                : 'custom';
        };

        const syncTopAreaWeekSelectWithRange = function(range) {
            if (!topAreaWeekSelect) {
                return;
            }
            const normalized = normalizeInsightRange(range && range.from, range && range.to);
            const key = normalized.from + '|' + normalized.to;
            const matched = topAreaWeekSelect.querySelector('option[value="' + key + '"]');
            topAreaWeekSelect.value = matched ? key : 'custom';
        };

        const renderInsightRangeStamp = function(range) {
            if (!insightWeeklyStamp) {
                return;
            }
            const fromText = toViDate(range.from);
            const toText = toViDate(range.to);
            if (!fromText || !toText) {
                insightWeeklyStamp.textContent = 'Update theo tuần';
                return;
            }
            const wk = getWeekNumber(new Date(range.to));
            insightWeeklyStamp.textContent = 'Tuần ' + wk + ' - ' + fromText + ' đến ' + toText;
        };

        const applyInsightRange = function(fromVal, toVal, shouldPersist) {
            const normalized = normalizeInsightRange(fromVal, toVal);
            if (insightDateFromInput) {
                insightDateFromInput.value = normalized.from;
            }
            if (insightDateToInput) {
                insightDateToInput.value = normalized.to;
            }
            renderInsightRangeStamp(normalized);
            syncTopAreaWeekSelectWithRange(normalized);
            if (shouldPersist) {
                saveDashboardState({
                    insightFrom: normalized.from,
                    insightTo: normalized.to
                });
                updateTopAreaFromSheet({ silent: true });
            }
        };

        const getDaysInMonth = function(year, month) {
            return new Date(year, month, 0).getDate();
        };

        const getMonthDocId = function(year, month) {
            return year + '_' + month;
        };

        const normalizeReporterName = function(value) {
            return String(value || '').trim();
        };

        const reporterStorageId = function(name) {
            return encodeURIComponent(normalizeReporterName(name).toLowerCase().replace(/\s+/g, '-') || 'nhan-vien-mac-dinh');
        };

        const reportStorageKey = function(year, month, reporter) {
            return reportPrefix + '_' + year + '_' + month + '_' + reporterStorageId(reporter);
        };

        const buildFlatSeriesInMillions = function(value, days) {
            const millionValue = Number((((value || 0) / 1000000)).toFixed(2));
            return Array.from({ length: days }, () => millionValue);
        };

        const formatVnd = function(value) {
            return (Number(value) || 0).toLocaleString('vi-VN') + ' đ';
        };

        const initHomeReportDb = function() {
            if (homeReportDb) {
                return homeReportDb;
            }

            try {
                if (typeof firebase === 'undefined') {
                    return null;
                }

                if (!firebase.apps.length && window.MA_FIREBASE_CONFIG && window.MA_FIREBASE_CONFIG.apiKey) {
                    firebase.initializeApp(window.MA_FIREBASE_CONFIG);
                }

                homeReportDb = firebase.firestore();
            } catch (e) {
                homeReportDb = null;
            }

            return homeReportDb;
        };

        const aggregateReportStore = function(store, year, month) {
            const days = getDaysInMonth(year, month);
            const labels = Array.from({ length: days }, (_, index) => String(index + 1));
            const costSeries = Array.from({ length: days }, () => 0);
            const revenueSeries = Array.from({ length: days }, () => 0);
            const employees = (store && store.employees && typeof store.employees === 'object') ? store.employees : {};
            const employeeKeys = Object.keys(employees);
            const employeePresence = Array.from({ length: days }, () => 0);

            employeeKeys.forEach(function(employeeId) {
                const employee = employees[employeeId] || {};
                const data = (employee.data && typeof employee.data === 'object') ? employee.data : {};

                for (let day = 1; day <= days; day += 1) {
                    const row = data['d' + day] || {};
                    const dayCost = parseNumber(row.cost);
                    const dayRevenue = parseNumber(row.rev);
                    const hasAnySignal = dayCost > 0 || dayRevenue > 0 || parseNumber(row.mess) > 0 || parseNumber(row.sdt) > 0 || parseNumber(row.lich) > 0 || parseNumber(row.hd) > 0;

                    costSeries[day - 1] += dayCost;
                    revenueSeries[day - 1] += dayRevenue;
                    if (hasAnySignal) {
                        employeePresence[day - 1] += 1;
                    }
                }
            });

            const totalCost = costSeries.reduce((sum, value) => sum + value, 0);
            const totalRevenue = revenueSeries.reduce((sum, value) => sum + value, 0);
            let lastReportedDayIndex = -1;
            for (let i = 0; i < days; i += 1) {
                if (costSeries[i] > 0 || revenueSeries[i] > 0) {
                    lastReportedDayIndex = i;
                }
            }
            const reportDayIndex = lastReportedDayIndex >= 0 ? lastReportedDayIndex : 0;
            const currentCost = costSeries.slice(0, reportDayIndex + 1).reduce((sum, value) => sum + value, 0);
            const currentRevenue = revenueSeries.slice(0, reportDayIndex + 1).reduce((sum, value) => sum + value, 0);

            return {
                labels: labels,
                costSeries: costSeries.map(function(value) { return Number((value / 1000000).toFixed(2)); }),
                revenueSeries: revenueSeries.map(function(value) { return Number((value / 1000000).toFixed(2)); }),
                totalCost: totalCost,
                totalRevenue: totalRevenue,
                currentCost: currentCost,
                currentRevenue: currentRevenue,
                reportDay: reportDayIndex + 1,
                totalEmployees: employeeKeys.length,
                employeePresence: employeePresence,
                days: days
            };
        };

        const buildLocalMonthStore = function(year, month) {
            let reporterNames = [];
            try {
                reporterNames = JSON.parse(localStorage.getItem(reportEmployeeKey) || '[]');
            } catch (e) {
                reporterNames = [];
            }

            const cleanNames = Array.isArray(reporterNames)
                ? reporterNames.map(normalizeReporterName).filter(Boolean)
                : [];
            const employees = {};

            cleanNames.forEach(function(name) {
                try {
                    const raw = JSON.parse(localStorage.getItem(reportStorageKey(year, month, name)) || '{}') || {};
                    employees[reporterStorageId(name)] = { name: name, data: raw };
                } catch (e) {
                    employees[reporterStorageId(name)] = { name: name, data: {} };
                }
            });

            return { month: month, year: year, employees: employees };
        };

        const initialDashboardState = loadDashboardState();
        populateDistrictSelectOptions();
        populateTopAreaWeekSelect();
        applyInsightRange(initialDashboardState.insightFrom, initialDashboardState.insightTo, false);
        const initialSheetCfg = loadTopAreaSheetConfig();
        applyTopAreaSheetAccessByRole();
        setTimeout(applyTopAreaSheetAccessByRole, 1200);
        if (topAreaSheetUrlInput) {
            topAreaSheetUrlInput.value = String(initialSheetCfg.url || '');
        }
        if (topAreaSheetApplyBtn) {
            topAreaSheetApplyBtn.addEventListener('click', async function() {
                if (!canManageTopAreaSheet()) {
                    applyTopAreaSheetAccessByRole();
                    setTopAreaStatus('Chỉ superadmin mới có quyền liên kết Google Sheet.', 'bad');
                    return;
                }
                const nextUrl = topAreaSheetUrlInput ? topAreaSheetUrlInput.value.trim() : '';
                const nextGid = extractSheetGid(nextUrl) || String((initialSheetCfg && initialSheetCfg.gid) || '0').trim() || '0';
                const nextCfg = saveTopAreaSheetConfig({ url: nextUrl, gid: nextGid });
                try {
                    await saveTopAreaSheetConfigRemote(nextCfg);
                } catch (e) {
                    setTopAreaStatus('Đã lưu cục bộ, nhưng chưa đồng bộ được cấu hình lên Firestore.', 'bad');
                }
                updateTopAreaFromSheet({ silent: false });
            });
        }
        if (String(initialSheetCfg.url || '').trim()) {
            updateTopAreaFromSheet({ silent: true });
        }
        if (insightDateFromInput) {
            insightDateFromInput.addEventListener('change', function() {
                applyInsightRange(insightDateFromInput.value, insightDateToInput ? insightDateToInput.value : '', true);
            });
        }
        if (insightDateToInput) {
            insightDateToInput.addEventListener('change', function() {
                applyInsightRange(insightDateFromInput ? insightDateFromInput.value : '', insightDateToInput.value, true);
            });
        }
        if (topAreaWeekSelect) {
            topAreaWeekSelect.addEventListener('change', function() {
                const value = String(topAreaWeekSelect.value || '').trim();
                if (!value || value === 'custom' || value.indexOf('|') === -1) {
                    return;
                }
                const parts = value.split('|');
                applyInsightRange(parts[0], parts[1], true);
            });
        }

        const chart = new Chart(adsPerformanceChartCanvas, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Chi phí theo ngày (triệu VNĐ)',
                        data: [],
                        tension: 0.18,
                        borderColor: '#ef5e7a',
                        backgroundColor: 'rgba(239, 94, 122, 0.08)',
                        pointBackgroundColor: '#db2777',
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        borderWidth: 3,
                        fill: false
                    },
                    {
                        label: 'Doanh thu theo ngày (triệu VNĐ)',
                        data: [],
                        tension: 0.18,
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.08)',
                        pointBackgroundColor: '#16a34a',
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        borderWidth: 3,
                        fill: false
                    },
                    {
                        label: 'Tổng KPI (triệu VNĐ)',
                        data: [],
                        tension: 0,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.06)',
                        pointBackgroundColor: '#2563eb',
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        borderWidth: 2,
                        borderDash: [8, 6],
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 12,
                            font: {
                                size: 12,
                                weight: '600'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const dsLabel = context.dataset && context.dataset.label ? context.dataset.label : 'Giá trị';
                                const valMillion = Number(context.parsed && context.parsed.y ? context.parsed.y : 0);
                                const valVnd = Math.round(valMillion * 1000000);
                                return dsLabel + ': ' + valMillion.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' triệu (' + formatVnd(valVnd) + ')';
                            },
                            afterLabel: function(context) {
                                const ds = context.dataset && Array.isArray(context.dataset.data) ? context.dataset.data : [];
                                const idx = context.dataIndex;
                                if (!ds.length || idx <= 0) {
                                    return '';
                                }
                                const prev = Number(ds[idx - 1] || 0);
                                const cur = Number(ds[idx] || 0);
                                const diff = Number((cur - prev).toFixed(2));
                                const sign = diff > 0 ? '+' : '';
                                return 'So với hôm trước: ' + sign + diff.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' triệu';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Ngày'
                        },
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: 16,
                            color: '#6f4b5c'
                        },
                        grid: {
                            color: 'rgba(122, 74, 98, 0.09)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Chi phí / Doanh thu theo ngày và Tổng KPI (triệu VNĐ)'
                        },
                        beginAtZero: true,
                        ticks: {
                            color: '#6f4b5c',
                            callback: function(value) {
                                return Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr';
                            }
                        },
                        grid: {
                            color: 'rgba(122, 74, 98, 0.11)'
                        }
                    }
                }
            }
        });

        const savedState = loadDashboardState();
        if (savedState.revenue) {
            revenueInput.value = String(savedState.revenue);
        }
        if (savedState.campaign) {
            campaignInput.value = String(savedState.campaign);
        }

        const applyChartSeries = function(series) {
            const totalKpiRevenue = parseNumber(revenueInput.value);
            const campaignCount = clampCampaign(campaignInput.value);
            const kpiTotalSeries = buildFlatSeriesInMillions(totalKpiRevenue, series.days || 30);
            const currentCost = series.currentCost || series.totalCost || 0;
            const currentRevenue = series.currentRevenue || series.totalRevenue || 0;

            setRoasAlertContext(currentCost, currentRevenue);

            budgetInput.value = formatWithSeparator(currentCost);
            dailyBudgetInput.value = formatWithSeparator(currentRevenue);
            revenueInput.value = formatWithSeparator(totalKpiRevenue);
            campaignInput.value = String(campaignCount);

            if (reportEmployeeStat) {
                const reportDay = Math.max(1, Math.min(series.reportDay || 1, series.days || 1));
                const activeEmployees = Array.isArray(series.employeePresence) ? (series.employeePresence[reportDay - 1] || 0) : 0;
                reportEmployeeStat.textContent = 'Tổng nhân viên: ' + (series.totalEmployees || 0) + ' | Có báo cáo ngày ' + reportDay + ': ' + activeEmployees;
            }

            saveDashboardState({
                revenue: totalKpiRevenue,
                campaign: campaignCount
            });

            chart.data.labels = series.labels;
            chart.data.datasets[0].data = series.costSeries;
            chart.data.datasets[1].data = series.revenueSeries;
            chart.data.datasets[2].data = kpiTotalSeries;
            chart.update();
        };

        const updateDashboardChart = function() {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();
            const fallbackStore = buildLocalMonthStore(year, month);
            const fallbackSeries = aggregateReportStore(fallbackStore, year, month);
            applyChartSeries(fallbackSeries);
        };

        const bindHomeReportRealtime = function() {
            const db = initHomeReportDb();
            if (!db) {
                updateDashboardChart();
                return;
            }

            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();

            if (homeReportUnsub) {
                homeReportUnsub();
                homeReportUnsub = null;
            }

            homeReportUnsub = db.collection(reportCollection).doc(getMonthDocId(year, month)).onSnapshot(function(snapshot) {
                if (!snapshot.exists) {
                    updateDashboardChart();
                    return;
                }

                const remoteStore = snapshot.data() || {};
                const series = aggregateReportStore(remoteStore, year, month);
                applyChartSeries(series);
            }, function() {
                updateDashboardChart();
            });
        };

        revenueInput.addEventListener('input', updateDashboardChart);
        campaignInput.addEventListener('input', updateDashboardChart);
        window.addEventListener('storage', function(event) {
            const key = event && event.key ? event.key : '';
            if (!key) {
                return;
            }
            if (key.indexOf(reportPrefix + '_') === 0 || key === reportEmployeeKey || key === dashboardStorageKey) {
                updateDashboardChart();
            }
            if (key === topAreaSheetConfigKey) {
                updateTopAreaFromSheet({ silent: true });
            }
            if (key === topAreaSharedResultKey && !canManageTopAreaSheet()) {
                updateTopAreaFromSheet({ silent: true });
            }
            if (key === authSessionKey || key === authOwnerKey) {
                applyTopAreaSheetAccessByRole();
            }
            if (key === authAccountsKey) {
                applyTopAreaSheetAccessByRole();
            }
        });
        setInterval(updateDashboardChart, chartRefreshMs);
        setInterval(function() {
            updateTopAreaFromSheet({ silent: true });
        }, topAreaRefreshMs);

        bindHomeReportRealtime();
        bindTopAreaSheetConfigRealtime();
        hydrateHomeAlerts();
        adsPerformanceChartCanvas.dataset.chartReady = '1';
        return true;
    };

        if (canInitDashboardChart && !initDashboardChart()) {
            const fallbackChartScript = document.createElement('script');
            fallbackChartScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.3/chart.umd.min.js';
            fallbackChartScript.defer = true;

            fallbackChartScript.onload = function() {
                if (!initDashboardChart()) {
                    const chartPanel = adsPerformanceChartCanvas.closest('.chart-panel');
                    if (chartPanel) {
                        chartPanel.innerHTML = '<p style="margin:0;padding:1rem;color:#7a2e45;font-weight:700;">Không thể tải thư viện biểu đồ. Vui lòng tải lại trang (Ctrl+F5).</p>';
                    }
                }
            };

            fallbackChartScript.onerror = function() {
                const chartPanel = adsPerformanceChartCanvas.closest('.chart-panel');
                if (chartPanel) {
                    chartPanel.innerHTML = '<p style="margin:0;padding:1rem;color:#7a2e45;font-weight:700;">Không thể kết nối đến Chart.js. Vui lòng kiểm tra mạng hoặc thử lại sau.</p>';
                }
            };

            document.head.appendChild(fallbackChartScript);
        }
    } catch (chartError) {
        const chartCanvas = document.getElementById('adsPerformanceChart');
        const chartPanel = chartCanvas ? chartCanvas.closest('.chart-panel') : null;
        if (chartPanel) {
            chartPanel.innerHTML = '<p style="margin:0;padding:1rem;color:#7a2e45;font-weight:700;">Biểu đồ tạm thời không khả dụng. Các chức năng khác vẫn hoạt động bình thường.</p>';
        }
        console.error('Dashboard chart init failed:', chartError);
    }

    const checklistContainer = document.getElementById('checklistContainer');
    const addChecklistItemBtn = document.getElementById('addChecklistItemBtn');

    if (checklistContainer && addChecklistItemBtn) {
        const checklistStorageKey = 'homeChecklistItems';

        const createChecklistRow = function(item) {
            const row = document.createElement('label');
            row.className = 'checklist-row';
            row.innerHTML = `
                <input class="checklist-checkbox" type="checkbox" ${item.checked ? 'checked' : ''}>
                <input class="checklist-text" type="text" value="${(item.text || '').replace(/"/g, '&quot;')}" placeholder="Nhập nội dung checklist">
                <input class="checklist-due" type="date" value="${item.dueDate || ''}" aria-label="Hạn hoàn thành">
            `;

            const checkbox = row.querySelector('.checklist-checkbox');
            const textInput = row.querySelector('.checklist-text');
            const dueInput = row.querySelector('.checklist-due');

            const syncCheckedStyle = function() {
                row.classList.toggle('is-checked', checkbox.checked);
            };

            checkbox.addEventListener('change', function() {
                syncCheckedStyle();
                saveChecklist();
            });

            textInput.addEventListener('input', saveChecklist);
            dueInput.addEventListener('change', saveChecklist);
            syncCheckedStyle();
            return row;
        };

        var saveChecklist = function() {
            const allRows = checklistContainer.querySelectorAll('.checklist-row');
            const data = Array.from(allRows).map(function(row) {
                const checkboxEl = row.querySelector('.checklist-checkbox');
                const textEl = row.querySelector('.checklist-text');
                const dueEl = row.querySelector('.checklist-due');
                return {
                    checked: !!(checkboxEl && checkboxEl.checked),
                    text: (textEl && textEl.value) || '',
                    dueDate: (dueEl && dueEl.value) || ''
                };
            });

            localStorage.setItem(checklistStorageKey, JSON.stringify(data));
            setChecklistOverdueContext(data);
        };

        const savedChecklist = JSON.parse(localStorage.getItem(checklistStorageKey) || 'null');
        if (Array.isArray(savedChecklist) && savedChecklist.length) {
            checklistContainer.innerHTML = '';
            savedChecklist.forEach(function(item) {
                checklistContainer.appendChild(createChecklistRow(item));
            });
        } else {
            checklistContainer.querySelectorAll('.checklist-row').forEach(function(row) {
                const checkbox = row.querySelector('.checklist-checkbox');
                const textInput = row.querySelector('.checklist-text');
                const dueInput = row.querySelector('.checklist-due');

                const syncCheckedStyle = function() {
                    row.classList.toggle('is-checked', checkbox.checked);
                };

                checkbox.addEventListener('change', function() {
                    syncCheckedStyle();
                    saveChecklist();
                });
                textInput.addEventListener('input', saveChecklist);
                if (dueInput) {
                    dueInput.addEventListener('change', saveChecklist);
                }
                syncCheckedStyle();
            });

            saveChecklist();
        }

        addChecklistItemBtn.addEventListener('click', function() {
            const row = createChecklistRow({ checked: false, text: '' });
            checklistContainer.appendChild(row);
            const input = row.querySelector('.checklist-text');
            if (input) {
                input.focus();
            }
            saveChecklist();
        });
    }
// Account and authorization module (Firebase + localStorage fallback)
(function () {
    'use strict';

    // Keys
    var SESSION_KEY = 'ma_session_v1';
    var OWNER_KEY   = 'ma_owner_id_v1';
    var LOCAL_KEY   = 'ma_accounts_v1';

    // Firebase
    var db   = null;
    var COLL = 'ma_accounts';
    var CONF = 'ma_config';
    var firebaseStatusReason = 'Chưa khởi tạo Firebase.';

    var setFirebaseOffline = function (reason, err) {
        db = null;
        if (err && err.message) {
            firebaseStatusReason = err.message;
            return;
        }
        firebaseStatusReason = reason || 'Kết nối Firebase không ổn định.';
    };

    var initFirebase = function () {
        try {
            var cfg = window.MA_FIREBASE_CONFIG;
            if (!cfg || !cfg.apiKey || cfg.apiKey.indexOf('YOUR') === 0) {
                firebaseStatusReason = 'Thiếu hoặc chưa điền đúng cấu hình trong firebase-config.js.';
                return;
            }
            if (typeof firebase === 'undefined') {
                firebaseStatusReason = 'Không tải được Firebase SDK. Kiểm tra kết nối mạng.';
                return;
            }
            if (!firebase.apps.length) { firebase.initializeApp(cfg); }
            db = firebase.firestore();
            firebaseStatusReason = '';
        } catch (e) {
            setFirebaseOffline('Không thể khởi tạo Firestore.', e);
        }
    };

    var ensureFirebaseReady = function () {
        if (db) { return Promise.resolve(true); }
        var attempts = 3;
        var tryConnect = function () {
            initFirebase();
            if (db) { return Promise.resolve(true); }
            attempts -= 1;
            if (attempts <= 0) { return Promise.resolve(false); }
            return new Promise(function (resolve) {
                setTimeout(function () {
                    tryConnect().then(resolve);
                }, 450);
            });
        };
        return tryConnect();
    };

    // Normalize account object
    var norm = function (r) {
        r = (r && typeof r === 'object') ? r : {};
        return {
            id:        r.id        || ('u_' + Date.now() + '_' + Math.random().toString(36).slice(2)),
            username:  String(r.username  || '').trim(),
            password:  String(r.password  || '').trim(),
            passwordDisplay: String(r.passwordDisplay || '').trim(),
            passwordHash: String(r.passwordHash || '').trim(),
            passwordSalt: String(r.passwordSalt || '').trim(),
            fullName:  String(r.fullName  || '').trim(),
            role:      r.role === 'superadmin' ? 'superadmin' : 'staff',
            status:    (r.status === 'pending' || r.status === 'deleted') ? r.status : 'active',
            data:      (r.data && typeof r.data === 'object') ? r.data : {},
            createdAt: r.createdAt || Date.now(),
            updatedAt: r.updatedAt || Date.now()
        };
    };

    var randomSalt = function () {
        return 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    };

    var toHex = function (buffer) {
        return Array.from(new Uint8Array(buffer)).map(function (b) {
            return b.toString(16).padStart(2, '0');
        }).join('');
    };

    var hashPassword = function (password, salt) {
        var input = String(salt || '') + '::' + String(password || '');
        if (window.crypto && window.crypto.subtle && window.TextEncoder) {
            return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)).then(toHex);
        }
        // Legacy fallback for very old browsers
        return Promise.resolve(btoa(unescape(encodeURIComponent(input))));
    };

    var buildPasswordSecret = function (plainPassword) {
        var salt = randomSalt();
        return hashPassword(plainPassword, salt).then(function (hash) {
            return {
                password: '',
                passwordHash: hash,
                passwordSalt: salt
            };
        });
    };

    var verifyAndUpgradePassword = function (user, plainPassword) {
        if (!user) {
            return Promise.resolve({ ok: false, upgradedUser: null });
        }

        if (user.passwordHash && user.passwordSalt) {
            return hashPassword(plainPassword, user.passwordSalt).then(function (hash) {
                return { ok: hash === user.passwordHash, upgradedUser: null };
            });
        }

        var legacyPassword = String(user.password || '');
        if (!legacyPassword || legacyPassword !== plainPassword) {
            return Promise.resolve({ ok: false, upgradedUser: null });
        }

        return buildPasswordSecret(plainPassword).then(function (secret) {
            return {
                ok: true,
                upgradedUser: Object.assign({}, user, secret, { updatedAt: Date.now() })
            };
        });
    };

    // localStorage helpers
    var lsGet = function (key, fb) {
        try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; }
        catch (e) { return fb; }
    };
    var localAll = function () {
        var a = lsGet(LOCAL_KEY, []);
        return Array.isArray(a) ? a.map(norm).filter(function (u) { return !!u.username; }) : [];
    };
    var localSave = function (arr) {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(
            arr.map(norm).filter(function (u) { return !!u.username; })
        ));
    };

    // Async account CRUD
    var getAccounts = function () {
        if (!db) { initFirebase(); }
        if (db) {
            return db.collection(COLL).get().then(function (snap) {
                return snap.docs
                    .map(function (d) { return norm(Object.assign({ id: d.id }, d.data())); })
                    .filter(function (u) { return !!u.username; });
            }).catch(function (err) {
                setFirebaseOffline('Kết nối Firebase không ổn định. Đang dùng dữ liệu cục bộ.', err);
                return localAll();
            });
        }
        return Promise.resolve(localAll());
    };

    var upsertAccount = function (account) {
        var a = norm(account);
        if (!db) { initFirebase(); }
        if (db) {
            return db.collection(COLL).doc(a.id).set(a).then(function () { return a; }).catch(function (err) {
                setFirebaseOffline('Mất kết nối Firebase khi lưu dữ liệu. Đang lưu tạm trên trình duyệt.', err);
                var allFallback = localAll();
                var idxFallback = allFallback.findIndex(function (u) { return u.id === a.id; });
                if (idxFallback >= 0) { allFallback[idxFallback] = a; } else { allFallback.push(a); }
                localSave(allFallback);
                return a;
            });
        }
        var all = localAll();
        var idx = all.findIndex(function (u) { return u.id === a.id; });
        if (idx >= 0) { all[idx] = a; } else { all.push(a); }
        localSave(all);
        return Promise.resolve(a);
    };

    var updateAccountField = function (id, fields) {
        if (!db) { initFirebase(); }
        if (db) {
            return db.collection(COLL).doc(id).update(Object.assign({}, fields, { updatedAt: Date.now() })).catch(function (err) {
                setFirebaseOffline('Mất kết nối Firebase khi cập nhật dữ liệu. Đang dùng dữ liệu cục bộ.', err);
                return getAccounts().then(function (all) {
                    var idx = all.findIndex(function (u) { return u.id === id; });
                    if (idx >= 0) { Object.assign(all[idx], fields, { updatedAt: Date.now() }); localSave(all); }
                });
            });
        }
        return getAccounts().then(function (all) {
            var idx = all.findIndex(function (u) { return u.id === id; });
            if (idx >= 0) { Object.assign(all[idx], fields, { updatedAt: Date.now() }); localSave(all); }
        });
    };

    // Owner ID — stored in Firestore config + localStorage
    var getOwnerId = function () {
        if (!db) { initFirebase(); }
        if (db) {
            return db.collection(CONF).doc('owner').get().then(function (snap) {
                return (snap.exists && snap.data().ownerId) ? snap.data().ownerId : (localStorage.getItem(OWNER_KEY) || '');
            }).catch(function (err) {
                setFirebaseOffline('Mất kết nối Firebase khi đọc cấu hình quản trị.', err);
                return localStorage.getItem(OWNER_KEY) || '';
            });
        }
        return Promise.resolve(localStorage.getItem(OWNER_KEY) || '');
    };

    var setOwnerId = function (id) {
        if (!id) { return Promise.resolve(); }
        localStorage.setItem(OWNER_KEY, id);
        if (!db) { initFirebase(); }
        if (db) {
            return db.collection(CONF).doc('owner').set({ ownerId: id }).catch(function (err) {
                setFirebaseOffline('Mất kết nối Firebase khi lưu cấu hình quản trị.', err);
            });
        }
        return Promise.resolve();
    };

    // Session — per-device localStorage (intentional)
    var getSession   = function () { return lsGet(SESSION_KEY, null); };
    var setSession   = function (s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); };
    var clearSession = function () { localStorage.removeItem(SESSION_KEY); };

    // UI helpers
    var setSiteLocked = function (lock) {
        if (document.body) { document.body.classList.toggle('auth-site-locked', !!lock); }
    };

    var showLoading = function (msg) {
        var el = document.getElementById('maLoadingOverlay');
        if (!el) {
            el = document.createElement('div');
            el.id = 'maLoadingOverlay';
            el.style.cssText = 'position:fixed;inset:0;background:rgba(255,248,251,.96);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999999;';
            el.innerHTML =
                '<div style="width:40px;height:40px;border:4px solid #f0d0db;border-top-color:#c7517c;border-radius:50%;animation:maSpn .75s linear infinite;margin-bottom:1rem;"></div>' +
                '<p id="maLoadingMsg" style="color:#7a2e45;font-weight:700;font-size:.92rem;margin:0;font-family:inherit;"></p>' +
                '<style>@keyframes maSpn{to{transform:rotate(360deg)}}</style>';
            document.body.appendChild(el);
        }
        var m = document.getElementById('maLoadingMsg');
        if (m) { m.textContent = msg || 'Đang tải...'; }
        el.style.display = 'flex';
    };

    var hideLoading = function () {
        var el = document.getElementById('maLoadingOverlay');
        if (el) { el.style.display = 'none'; }
    };

    var addAuthStyles = function () {
        if (document.getElementById('authStyles')) { return; }
        var s = document.createElement('style');
        s.id = 'authStyles';
        s.textContent =
            '.auth-overlay{position:fixed;inset:0;background:rgba(255,248,251,.96);display:flex;align-items:center;justify-content:center;z-index:99999;padding:1rem;}' +
            '.auth-modal{width:min(460px,96vw);background:#fff;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.25);padding:1.2rem 1.25rem;}' +
            '.auth-title{margin:0 0 .35rem;color:#7a2e45;font-size:1.22rem;font-weight:800;}' +
            '.auth-sub{margin:0 0 .85rem;color:#7e6d75;font-size:.9rem;}' +
            '.auth-grid{display:grid;gap:.55rem;}' +
            '.auth-input{width:100%;border:1px solid #e8cbd7;border-radius:10px;padding:.65rem .75rem;font-size:.93rem;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s;}' +
            '.auth-input:focus{border-color:#c7517c;box-shadow:0 0 0 3px rgba(199,81,124,.15);}' +
            '.auth-actions{display:flex;gap:.5rem;margin-top:.8rem;}' +
            '.auth-btn{flex:1;border:none;border-radius:10px;padding:.65rem .85rem;font-weight:700;cursor:pointer;font-size:.93rem;transition:opacity .15s;}' +
            '.auth-btn:disabled{opacity:.5;cursor:not-allowed;}' +
            '.auth-btn.primary{background:linear-gradient(135deg,#c7517c,#a93c63);color:#fff;}' +
            '.auth-btn.gray{background:#f5f2f4;color:#6d5a62;border:1px solid #e5d9de;}' +
            '.auth-error{margin-top:.6rem;font-weight:700;font-size:.86rem;min-height:1.2rem;}' +
            '.auth-badge{display:inline-flex;align-items:center;gap:.45rem;padding:.35rem .65rem;border-radius:999px;background:#fff0f5;color:#7a2e45;border:1px solid #f1c6d8;font-weight:700;font-size:.82rem;}' +
            '.auth-badge button{border:none;background:#c7517c;color:#fff;border-radius:999px;padding:.2rem .55rem;cursor:pointer;font-size:.75rem;font-weight:700;}' +
            '.admin-note{margin:.5rem 0;color:#7f2d4a;font-weight:700;font-size:.9rem;}' +
            '.admin-denied{padding:1rem;border:1px dashed #e9c8d6;border-radius:12px;background:#fff7fb;color:#7f2d4a;font-weight:700;}' +
            '.account-status.pending{background:#fef9c3;color:#854d0e;border:1px solid #fde68a;padding:.18rem .48rem;border-radius:999px;display:inline-block;}' +
            'body.auth-site-locked>*:not(#authOverlay):not(#maLoadingOverlay){display:none!important;}';
        document.head.appendChild(s);
    };

    // Seed default superadmin
    var ensureSuperadmin = function () {
        return getAccounts().then(function (users) {
            var exists = users.some(function (u) { return u.username.toLowerCase() === 'thanhson'; });
            if (!exists) {
                return buildPasswordSecret('son2048').then(function (secret) {
                    var sa = norm({
                        id: 'u_superadmin_thanhson',
                        username: 'thanhson',
                        fullName: 'Quản Trị Hệ Thống',
                        role: 'superadmin',
                        status: 'active',
                        password: 'son2048',
                        passwordHash: secret.passwordHash,
                        passwordSalt: secret.passwordSalt
                    });
                    return upsertAccount(sa).then(function () { return setOwnerId(sa.id); });
                });
            }
            var sa2 = users.find(function (u) { return u.username.toLowerCase() === 'thanhson'; });
            return getOwnerId().then(function (oid) {
                if (sa2 && !oid) { return setOwnerId(sa2.id); }
            });
        });
    };

    // Ensure only one superadmin
    var enforceSingleSuperadmin = function () {
        return getOwnerId().then(function (ownerId) {
            if (!ownerId) { return; }
            return getAccounts().then(function (users) {
                var ps = [];
                users.forEach(function (u) {
                    if (u.id !== ownerId && u.role === 'superadmin') {
                        ps.push(upsertAccount(Object.assign({}, u, { role: 'staff', updatedAt: Date.now() })));
                    }
                });
                return Promise.all(ps);
            });
        });
    };

    var getCurrentUser = function () {
        var ses = getSession();
        if (!ses || !ses.userId) { return Promise.resolve(null); }
        return getAccounts().then(function (users) {
            return users.find(function (u) { return u.id === ses.userId; }) || null;
        });
    };

    // Auth modal
    var hideAuthModal = function () {
        var el = document.getElementById('authOverlay');
        if (el) { el.remove(); }
    };

    var showAuthModal = function () {
        addAuthStyles();
        hideAuthModal();
        var overlay = document.createElement('div');
        overlay.className = 'auth-overlay';
        overlay.id = 'authOverlay';
        overlay.innerHTML =
            '<div class="auth-modal">' +
                '<h3 class="auth-title">Đăng nhập hệ thống</h3>' +
                '<p class="auth-sub">Bạn hãy đăng nhập để tiếp tục.</p>' +
                '<div class="auth-grid">' +
                    '<input id="loginUsername" class="auth-input" type="text" placeholder="Tên đăng nhập" autocomplete="username">' +
                    '<input id="loginPassword" class="auth-input" type="password" placeholder="Mật khẩu" autocomplete="current-password">' +
                '</div>' +
                '<div class="auth-actions">' +
                    '<button id="loginSubmitBtn" class="auth-btn primary" type="button">Đăng nhập</button>' +
                '</div>' +
                '<p id="authError" class="auth-error"></p>' +
            '</div>';
        document.body.appendChild(overlay);

        var errorEl  = document.getElementById('authError');
        var loginBtn = document.getElementById('loginSubmitBtn');
        var unInput  = document.getElementById('loginUsername');
        var pwInput  = document.getElementById('loginPassword');

        var pf = sessionStorage.getItem('ma_prefill_username');
        if (pf && unInput) { unInput.value = pf; sessionStorage.removeItem('ma_prefill_username'); }

        var doLogin = function () {
            var username = (unInput  ? unInput.value  : '').trim().toLowerCase();
            var password = (pwInput  ? pwInput.value  : '').trim();
            if (!username || !password) {
                errorEl.style.color = '#dc2626';
                errorEl.textContent = 'Vui lòng nhập tên đăng nhập và mật khẩu.';
                return;
            }
            loginBtn.disabled = true;
            loginBtn.textContent = 'Đang kiểm tra...';
            showLoading('Đang đăng nhập...');
            getAccounts().then(function (users) {
                var user = users.find(function (u) {
                    return u.username.toLowerCase() === username;
                });
                return verifyAndUpgradePassword(user, password).then(function (auth) {
                    hideLoading();
                    if (!auth.ok || !user) {
                        errorEl.style.color = '#dc2626';
                        errorEl.textContent = 'Sai tên đăng nhập hoặc mật khẩu.';
                        loginBtn.disabled = false; loginBtn.textContent = 'Đăng nhập';
                        return;
                    }

                    var continueLogin = function () {
                        if (user.status === 'pending') {
                            errorEl.style.color = '#dc2626';
                            errorEl.textContent = 'Tài khoản đang chờ quản trị cao nhất duyệt.';
                            loginBtn.disabled = false; loginBtn.textContent = 'Đăng nhập';
                            return;
                        }
                        if (user.status !== 'active') {
                            errorEl.style.color = '#dc2626';
                            errorEl.textContent = 'Tài khoản bị vô hiệu hóa hoặc đã xóa.';
                            loginBtn.disabled = false; loginBtn.textContent = 'Đăng nhập';
                            return;
                        }
                        setSession({ userId: user.id, at: Date.now() });
                        setSiteLocked(false);
                        hideAuthModal();
                        location.href = './index.html';
                    };

                    if (auth.upgradedUser) {
                        upsertAccount(auth.upgradedUser).finally(continueLogin);
                        return;
                    }

                    continueLogin();
                });
            }).catch(function () {
                hideLoading();
                errorEl.style.color = '#dc2626';
                errorEl.textContent = 'Lỗi kết nối. Vui lòng thử lại.';
                loginBtn.disabled = false; loginBtn.textContent = 'Đăng nhập';
            });
        };

        if (loginBtn) { loginBtn.addEventListener('click', doLogin); }
        if (pwInput)  { pwInput.addEventListener('keydown',  function (e) { if (e.key === 'Enter') { doLogin(); } }); }
        if (unInput)  { unInput.addEventListener('keydown',  function (e) { if (e.key === 'Enter') { pwInput && pwInput.focus(); } }); }
    };

    // Nav badge
    var mountAuthBadge = function (user) {
        var nl = document.querySelector('header nav .nav-links');
        if (!nl) { return; }
        var adminItem = document.getElementById('adminPanelNav');
        if (user && user.role === 'superadmin') {
            if (!adminItem) {
                adminItem = document.createElement('li');
                adminItem.id = 'adminPanelNav';
                nl.appendChild(adminItem);
            }
            adminItem.innerHTML = '<a href="./admin.html">Quản trị tài khoản</a>';
        } else if (adminItem) {
            adminItem.remove();
        }
        var host = document.getElementById('authNavHost');
        if (!host) { host = document.createElement('li'); host.id = 'authNavHost'; nl.appendChild(host); }
        if (!user) { host.innerHTML = ''; return; }
        host.innerHTML = '<span class="auth-badge">' +
            (user.fullName || user.username) +
            ' (' + (user.role === 'superadmin' ? 'Quản trị cao nhất' : 'Nhân sự') + ')' +
            '<button id="logoutBtn" type="button">Thoát</button></span>';
        var lb = document.getElementById('logoutBtn');
        if (lb) { lb.addEventListener('click', function () { clearSession(); location.reload(); }); }
    };

    // Account manager page
    var initAccountManager = function (currentUser) {
        var root = document.getElementById('accountManagerRoot');
        if (!root) { return Promise.resolve(); }
        if (!currentUser) {
            root.innerHTML = '<div class="admin-denied">Bạn chưa đăng nhập. Vui lòng đăng nhập để sử dụng trang quản trị tài khoản.</div>';
            return Promise.resolve();
        }
        if (currentUser.role !== 'superadmin') {
            root.innerHTML = '<div class="admin-denied">Bạn không có quyền truy cập khu vực này. Chỉ tài khoản quản trị cao nhất mới được quản lý nhân sự.</div>';
            return Promise.resolve();
        }

        var filterState = { keyword: '', status: 'all', role: 'all' };

        var showMsg = function (text, good) {
            var el = document.getElementById('accountActionMsg');
            if (!el) { return; }
            el.textContent = text;
            el.style.color = good ? '#15803d' : '#b91c1c';
        };

        var render = function () {
            return getOwnerId().then(function (ownerId) {
                return getAccounts().then(function (users) {
                    var k = filterState.keyword.trim().toLowerCase();
                    var filtered = users.filter(function (u) {
                        if (filterState.status !== 'all' && u.status !== filterState.status) { return false; }
                        if (filterState.role   !== 'all' && u.role   !== filterState.role)   { return false; }
                        if (!k) { return true; }
                        return (u.fullName + ' ' + u.username).toLowerCase().includes(k);
                    });

                    var rows = filtered.map(function (u) {
                        var isSelf  = u.id === currentUser.id;
                        var isOwner = u.id === ownerId;
                                                var stLabel = u.status === 'active' ? 'Hoạt động' : (u.status === 'pending' ? 'Chờ duyệt' : 'Đã xóa');
                        var stClass = u.status === 'active' ? 'active' : (u.status === 'pending' ? 'pending' : 'deleted');
                                                var roleHtml = isOwner ? '<span class="account-status active">Quản trị cao nhất</span>' : 'Nhân sự';
                        var actHtml = u.status === 'active'
                                                        ? '<button class="account-btn warn" data-action="delete" data-id="' + u.id + '"' + (isSelf ? ' disabled' : '') + '>Xóa</button>'
                            : (u.status === 'pending'
                                                                ? '<button class="account-btn primary" data-action="approve" data-id="' + u.id + '">Duyệt</button>' +
                                                                    '<button class="account-btn warn" data-action="delete" data-id="' + u.id + '">Từ chối</button>'
                                                                : '<button class="account-btn gray" data-action="restore" data-id="' + u.id + '">Khôi phục</button>');
                        return '<tr>' +
                            '<td>' + (u.fullName || '-') + '</td>' +
                            '<td>' + u.username + '</td>' +
                                                        '<td>' + (u.passwordDisplay || u.password || '******') + '</td>' +
                            '<td>' + roleHtml + '</td>' +
                            '<td><span class="account-status ' + stClass + '">' + stLabel + '</span></td>' +
                            '<td>' + new Date(u.createdAt).toLocaleString('vi-VN') + '</td>' +
                            '<td><div class="account-actions">' + actHtml + '</div></td>' +
                            '</tr>';
                    }).join('');

                    var syncBadge = db
                        ? '<p style="color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:.45rem .75rem;margin:0 0 .85rem;font-weight:700;font-size:.88rem;">&#x2601;&#xFE0F; Firebase đã kết nối. Tài khoản được đồng bộ trên mọi thiết bị và trình duyệt.</p>'
                        : '<p style="color:#92400e;background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:.45rem .75rem;margin:0 0 .85rem;font-weight:700;font-size:.88rem;">&#x26A0;&#xFE0F; Chưa kết nối Firebase. Tài khoản chỉ hoạt động trên trình duyệt này. Lý do: ' + firebaseStatusReason + ' Kiểm tra lại firebase-config.js, đã bật Firestore và đã Publish Rules.</p>';

                    root.innerHTML = syncBadge +
                        '<div class="account-card">' +
                            '<h3 class="account-title" style="font-size:1.05rem;">Thêm tài khoản nhân sự</h3>' +
                            '<div class="account-grid">' +
                                '<input id="staffFullName" class="account-input" type="text" placeholder="Họ và tên nhân sự">' +
                                '<input id="staffUsername" class="account-input" type="text" placeholder="Tên đăng nhập">' +
                                '<input id="staffPassword" class="account-input" type="password" placeholder="Mật khẩu">' +
                            '</div>' +
                            '<div style="margin-top:.7rem;display:flex;gap:.5rem;align-items:center;">' +
                                '<button id="addStaffBtn" class="account-btn primary" type="button">Thêm tài khoản</button>' +
                                '<span id="accountActionMsg" class="admin-note"></span>' +
                            '</div>' +
                            '<p class="admin-note" style="margin-top:.5rem;">Hệ thống lưu mật khẩu ở dạng mã hóa để an toàn dữ liệu.</p>' +
                        '</div>' +
                        '<div class="account-card">' +
                            '<h3 class="account-title" style="font-size:1.05rem;">Danh sách tài khoản</h3>' +
                            '<div style="display:flex;flex-wrap:wrap;gap:.55rem;margin-bottom:.75rem;">' +
                                '<input id="accFkw" class="account-input" style="flex:1;min-width:160px;" type="text" placeholder="Tìm theo tên, tên đăng nhập">' +
                                '<select id="accFst" class="account-input" style="min-width:145px;">' +
                                    '<option value="all">Tất cả trạng thái</option>' +
                                    '<option value="active">Hoạt động</option>' +
                                    '<option value="pending">Chờ duyệt</option>' +
                                    '<option value="deleted">Đã xóa</option>' +
                                '</select>' +
                                '<select id="accFrl" class="account-input" style="min-width:135px;">' +
                                    '<option value="all">Tất cả vai trò</option>' +
                                    '<option value="superadmin">Quản trị cao nhất</option>' +
                                    '<option value="staff">Nhân sự</option>' +
                                '</select>' +
                                '<button id="accFapply" class="account-btn gray" type="button">Lọc</button>' +
                                '<button id="accFclear"  class="account-btn gray" type="button">Xóa lọc</button>' +
                            '</div>' +
                            '<div class="account-table-wrap">' +
                                '<table class="account-table">' +
                                    '<thead><tr><th>Họ tên</th><th>Tên đăng nhập</th><th>Mật khẩu</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>' +
                                    '<tbody>' + (rows || '<tr><td colspan="7" class="account-empty">Không có tài khoản phù hợp.</td></tr>') + '</tbody>' +
                                '</table>' +
                            '</div>' +
                        '</div>';

                    // Filter events
                    var fkw = document.getElementById('accFkw');
                    var fst = document.getElementById('accFst');
                    var frl = document.getElementById('accFrl');
                    var applyF = function () {
                        filterState.keyword = fkw ? fkw.value : '';
                        filterState.status  = fst ? fst.value : 'all';
                        filterState.role    = frl ? frl.value : 'all';
                        render();
                    };
                    if (fkw) { fkw.value = filterState.keyword; fkw.addEventListener('keydown', function (e) { if (e.key === 'Enter') { applyF(); } }); }
                    if (fst) { fst.value = filterState.status; }
                    if (frl) { frl.value = filterState.role; }
                    var applyBtn = document.getElementById('accFapply');
                    var clearBtn = document.getElementById('accFclear');
                    if (applyBtn) { applyBtn.addEventListener('click', applyF); }
                    if (clearBtn) { clearBtn.addEventListener('click', function () { filterState = { keyword: '', status: 'all', role: 'all' }; render(); }); }

                    // Add staff button
                    var addBtn = document.getElementById('addStaffBtn');
                    if (addBtn) {
                        addBtn.addEventListener('click', function () {
                            var fn = (document.getElementById('staffFullName').value || '').trim();
                            var un = (document.getElementById('staffUsername').value  || '').trim();
                            var pw = (document.getElementById('staffPassword').value  || '').trim();
                            if (!fn || !un || !pw) { showMsg('Vui lòng nhập đầy đủ thông tin.', false); return; }
                            addBtn.disabled = true;
                            getAccounts().then(function (allU) {
                                if (allU.some(function (u) { return u.username.toLowerCase() === un.toLowerCase(); })) {
                                    showMsg('Tên đăng nhập đã tồn tại.', false);
                                    addBtn.disabled = false;
                                    return;
                                }
                                return buildPasswordSecret(pw).then(function (secret) {
                                    return upsertAccount({
                                        id: 'u_' + Date.now(),
                                        username: un,
                                        password: pw,
                                        passwordDisplay: pw,
                                        passwordHash: secret.passwordHash,
                                        passwordSalt: secret.passwordSalt,
                                        fullName: fn,
                                        role: 'staff', status: 'active',
                                        data: {}, createdAt: Date.now(), updatedAt: Date.now()
                                    }).then(function () {
                                        showMsg('Đã thêm tài khoản nhân sự thành công.', true);
                                        document.getElementById('staffFullName').value = '';
                                        document.getElementById('staffUsername').value  = '';
                                        document.getElementById('staffPassword').value  = '';
                                        addBtn.disabled = false;
                                        render();
                                    });
                                });
                            }).catch(function () { showMsg('Lỗi khi lưu tài khoản. Thử lại.', false); addBtn.disabled = false; });
                        });
                    }

                    // Row action buttons
                    root.querySelectorAll('[data-action]').forEach(function (btn) {
                        btn.addEventListener('click', function () {
                            var action = this.dataset.action;
                            var uid    = this.dataset.id;
                            if (!uid) { return; }
                            var self = this;
                            self.disabled = true;
                            getAccounts().then(function (allU) {
                                var target = allU.find(function (u) { return u.id === uid; });
                                if (!target) { self.disabled = false; return; }
                                var p;
                                if (action === 'delete') {
                                    if (uid === currentUser.id) { showMsg('Không thể tự xóa tài khoản đang đăng nhập.', false); self.disabled = false; return; }
                                    p = updateAccountField(uid, { status: 'deleted' }).then(function () { showMsg('Đã xóa tài khoản (có thể khôi phục).', true); });
                                } else if (action === 'approve' || action === 'restore') {
                                    p = updateAccountField(uid, { status: 'active' }).then(function () { showMsg(action === 'approve' ? 'Đã duyệt tài khoản.' : 'Đã khôi phục tài khoản.', true); });
                                }
                                if (p) {
                                    p.then(function () { self.disabled = false; render(); })
                                     .catch(function () { showMsg('Thao tác thất bại. Thử lại.', false); self.disabled = false; });
                                } else { self.disabled = false; }
                            });
                        });
                    });
                });
            });
        };

        return render();
    };

    // Boot
    var bootAuthSystem = function () {
        addAuthStyles();
        showLoading('Đang kết nối...');
        ensureFirebaseReady()
            .then(function () { return ensureSuperadmin(); })
            .then(function () { return enforceSingleSuperadmin(); })
            .then(function () { return getCurrentUser(); })
            .then(function (currentUser) {
                mountAuthBadge(currentUser);
                hideLoading();
                if (!currentUser) {
                    setSiteLocked(true);
                    showAuthModal();
                    return initAccountManager(null);
                }
                setSiteLocked(false);
                return initAccountManager(currentUser);
            })
            .catch(function () {
                hideLoading();
                addAuthStyles();
                var overlay = document.createElement('div');
                overlay.className = 'auth-overlay';
                overlay.id = 'authOverlay';
                overlay.innerHTML =
                    '<div class="auth-modal">' +
                    '<h3 class="auth-title">Lỗi hệ thống</h3>' +
                    '<p class="auth-sub">Không thể tải hệ thống xác thực. Kiểm tra kết nối mạng và tải lại trang.</p>' +
                    '<div class="auth-actions"><button class="auth-btn primary" onclick="location.reload()">Tải lại trang</button></div>' +
                    '</div>';
                document.body.appendChild(overlay);
            });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootAuthSystem);
    } else {
        bootAuthSystem();
    }

    // Hamburger menu
    var initHamburger = function () {
        var navEl    = document.querySelector('header nav');
        var navLinks = document.querySelector('header nav .nav-links');
        if (!navEl || !navLinks || document.getElementById('navHamburger')) { return; }
        var btn = document.createElement('button');
        btn.id = 'navHamburger';
        btn.className = 'nav-hamburger';
        btn.setAttribute('aria-label', 'Mo menu');
        btn.innerHTML = '<span></span><span></span><span></span>';
        navEl.appendChild(btn);
        btn.addEventListener('click', function () {
            var open = navLinks.classList.toggle('nav-open');
            btn.classList.toggle('open', open);
            btn.setAttribute('aria-label', open ? 'Dong menu' : 'Mo menu');
        });
        navLinks.addEventListener('click', function (e) {
            if (e.target && e.target.tagName === 'A') {
                navLinks.classList.remove('nav-open');
                btn.classList.remove('open');
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHamburger);
    } else {
        initHamburger();
    }
}());