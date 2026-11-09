const crypto = require('crypto');

// Confere se o POST veio da Meta (HMAC-SHA256 com o App Secret)
function assinaturaValida(req) {
  const header = req.get('x-hub-signature-256') || '';
  const esperado =
    'sha256=' +
    crypto.createHmac('sha256', process.env.META_APP_SECRET)
      .update(req.rawBody)
      .digest('hex');

  const a = Buffer.from(header);
  const b = Buffer.from(esperado);
  // timingSafeEqual lança erro se os tamanhos forem diferentes
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Private reply: envia uma DM vinculada ao comentário.
// Confira na documentação atual da Meta a versão da Graph API e os parâmetros.
async function responderComentarioPorDM(commentId, texto) {
  const versao = process.env.GRAPH_VERSION || 'v21.0';
  const url = `https://graph.facebook.com/${versao}/${process.env.IG_USER_ID}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.IG_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      recipient: { comment_id: commentId },
      message: { text: texto },
    }),
  });

  if (!res.ok) throw new Error(`Meta API ${res.status}: ${await res.text()}`);
  return res.json();
}

module.exports = { assinaturaValida, responderComentarioPorDM };
