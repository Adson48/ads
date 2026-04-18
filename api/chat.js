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

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify({
                model: 'gpt-4.1-mini',
                temperature: 0.7,
                messages: messages
            })
        });

        const data = await response.json().catch(function() { return {}; });

        if (!response.ok) {
            return res.status(response.status || 502).json({
                error: (data && data.error && data.error.message) ? data.error.message : 'openai-request-failed'
            });
        }

        const reply = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
            ? String(data.choices[0].message.content).trim()
            : '';

        if (!reply) {
            return res.status(502).json({ error: 'empty-openai-reply' });
        }

        return res.status(200).json({ reply: reply });
    } catch (error) {
        return res.status(500).json({ error: error && error.message ? error.message : 'internal-error' });
    }
}
