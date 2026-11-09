const express = require('express');
const { regras } = require('./config');
const { assinaturaValida, responderComentarioPorDM } = require('./meta');
const { appendLead } = require('./sheets');

const app = express();
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));

// Evita processar duas vezes o mesmo comentário (a Meta pode reenviar eventos).
// Em memória: some se o servidor reiniciar. Para produção, use o Redis ou a própria planilha.
const jaProcessados = new Set();

function encontrarRegra(texto) {
  const t = (texto || '').toUpperCase();
  return regras.find((r) => t.includes(r.palavra.toUpperCase()));
}

// 1) Verificação do webhook (a Meta chama ao configurar)
app.get('/webhook', (req, res) => {
  const ok =
    req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === process.env.VERIFY_TOKEN;
  return ok ? res.status(200).send(req.query['hub.challenge']) : res.sendStatus(403);
});

// 2) Eventos
app.post('/webhook', (req, res) => {
  if (!assinaturaValida(req)) return res.sendStatus(401);
  res.sendStatus(200); // responde rápido; o processamento segue depois
  processarEventos(req.body).catch((err) => console.error('Erro geral:', err));
});

async function processarEventos(body) {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'comments') continue;

      const v = change.value || {};
      if (!v.id || jaProcessados.has(v.id)) continue;
      jaProcessados.add(v.id);

      const regra = encontrarRegra(v.text);
      if (!regra) continue;

      try {
        await appendLead({
          igUserId: v.from?.id,
          nome: v.from?.username,
          comentario: v.text,
          palavraChave: regra.palavra,
          tag: regra.tag,
        });
        await responderComentarioPorDM(v.id, regra.mensagem);
        console.log(`Lead registrado e DM enviada (${regra.tag})`);
      } catch (err) {
        console.error('Falha ao processar comentário', v.id, err.message);
      }
    }
  }
}

app.get('/health', (_req, res) => res.send('ok'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Rodando na porta ${port}`));
