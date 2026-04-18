// Cloudflare Worker proxy for ChatGPT integration.
// Deploy this worker, then copy its URL into the website "Endpoint" field.
// Required Worker secret: OPENAI_API_KEY

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const json = function(payload, status) {
    return new Response(JSON.stringify(payload), {
        status: status || 200,
        headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, corsHeaders)
    });
};

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response('', { status: 204, headers: corsHeaders });
        }

        if (request.method !== 'POST') {
            return json({ error: 'method-not-allowed' }, 405);
        }

        if (!env.OPENAI_API_KEY) {
            return json({ error: 'missing-openai-api-key' }, 500);
        }

        try {
            const body = await request.json().catch(function() { return {}; });
            const message = String((body && body.message) || '').trim();
            const incoming = Array.isArray(body && body.messages) ? body.messages : [];

            if (!message) {
                return json({ error: 'missing-message' }, 400);
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
                content: 'Bạn là trợ lý nội dung marketing tiếng Việt cho ngành mẹ bầu. Trả lời súc tích, rõ ràng, thực chiến.'
            }].concat(history);

            if (!history.length || history[history.length - 1].content !== message) {
                messages.push({ role: 'user', content: message });
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + env.OPENAI_API_KEY
                },
                body: JSON.stringify({
                    model: 'gpt-4.1-mini',
                    temperature: 0.7,
                    messages: messages
                })
            });

            const data = await response.json().catch(function() { return {}; });

            if (!response.ok) {
                return json({
                    error: data && data.error && data.error.message ? data.error.message : 'openai-request-failed'
                }, response.status || 502);
            }

            const reply = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
                ? String(data.choices[0].message.content).trim()
                : '';

            if (!reply) {
                return json({ error: 'empty-openai-reply' }, 502);
            }

            return json({ reply: reply }, 200);
        } catch (error) {
            return json({ error: error && error.message ? error.message : 'internal-error' }, 500);
        }
    }
};
