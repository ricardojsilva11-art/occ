# OCC Diário

App pessoal de Duty Manager OCC: escala, RDO e checklists. Funciona sem rede e sincroniza entre dispositivos.

- **App:** GitHub Pages (`index.html`, `sw.js`, `manifest.webmanifest`, ícones, `vendor/`)
- **Sincronização:** Cloudflare Worker `occ-api` (`worker/worker.js`) com a base D1 `occ` ligada como `DB`
- **Privacidade:** cada pessoa entra com um código pessoal. O servidor guarda só o hash do código, por isso quem não tem o código não vê nada.

## Base de dados (já criada)

```sql
CREATE TABLE docs (uid TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
  updated INTEGER NOT NULL, srv INTEGER NOT NULL, PRIMARY KEY (uid, id));
CREATE INDEX docs_srv ON docs(uid, srv);
```

## Publicar o Worker

1. Cloudflare → Workers & Pages → Create → Worker → nome `occ-api` → Deploy
2. Edit code → colar `worker/worker.js` → Deploy
3. Settings → Bindings → Add → D1 database → nome da variável `DB` → base `occ`

## Publicar a app

Settings → Pages → Branch `main` / pasta `/ (root)` → Save.
