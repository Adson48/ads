export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'method-not-allowed' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'missing-openai-api-key' });
    }

    const buildFallbackReply = function(userMessage) {
        const prompt = String(userMessage || '').trim();
        return [
            'Hiện OpenAI đang báo hết quota/tốc độ cao, nên hệ thống chuyển sang phản hồi tạm thời.',
            '',
            'Gợi ý nhanh để bạn dùng ngay:',
            '1) Tiêu đề quảng cáo: "Mẹ bầu an tâm mỗi ngày với giải pháp dịu nhẹ, rõ nguồn gốc".',
            '2) Hook mở bài: "Nếu bạn đang mang thai và lo lắng về dinh dưỡng mỗi ngày, nội dung này dành cho bạn".',
            '3) CTA: "Để lại tin nhắn để nhận checklist chăm sóc theo tuần thai".',
            '',
            'Nội dung bạn vừa hỏi:',
            prompt || '(trống)'
        ].join('\n');
    };

    const requestChatCompletion = async function(model, messages, apiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify({
                model: model,
                temperature: 0.7,
                messages: messages
            })
        });

        const data = await response.json().catch(function() { return {}; });
        const reply = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
            ? String(data.choices[0].message.content).trim()
            : '';

        return {
            ok: response.ok,
            status: response.status,
            data: data,
            reply: reply
        };
    };

    try {
        const body = (req && req.body && typeof req.body === 'object') ? req.body : {};
        const message = String(body.message || '').trim();
        const incoming = Array.isArray(body.messages) ? body.messages : [];

        if (!message) {
            return res.status(400).json({ error: 'missing-message' });
        }

        const history = incoming
            .filter(function(item) {
                return item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string';
            })
            .slice(-10)
            .map(function(item) {
                return { role: item.role, content: item.content };
            });

        const messages = [{
            role: 'system',
            content: 'Bạn là trợ lý nội dung marketing tiếng Việt cho ngành mẹ bầu. Trả lời ngắn gọn, rõ ràng, dễ áp dụng.'
        }].concat(history);

        if (!history.length || history[history.length - 1].content !== message) {
            messages.push({ role: 'user', content: message });
        }

        const models = ['gpt-4.1-mini', 'gpt-4o-mini'];
        let lastFailure = null;

        for (let i = 0; i < models.length; i++) {
            const result = await requestChatCompletion(models[i], messages, apiKey);

            if (result.ok && result.reply) {
                return res.status(200).json({ reply: result.reply, model: models[i] });
            }

            if (result.status === 401) {
                return res.status(401).json({ error: 'OpenAI API key không hợp lệ hoặc đã bị thu hồi.' });
            }

            lastFailure = result;
        }

        if (lastFailure && lastFailure.status === 429) {
            return res.status(200).json({
                reply: buildFallbackReply(message),
                fallback: true,
                warning: 'OpenAI tạm thời không khả dụng do quota/rate limit.'
            });
        }

        var apiError = (lastFailure && lastFailure.data && lastFailure.data.error && lastFailure.data.error.message)
            ? lastFailure.data.error.message
            : 'openai-request-failed';
        return res.status((lastFailure && lastFailure.status) || 502).json({ error: apiError });
    } catch (error) {
        return res.status(500).json({ error: error && error.message ? error.message : 'internal-error' });
    }
}
