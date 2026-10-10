# Site JM Soluções — Iperó/SP

Site institucional e catálogo de produtos da JM Soluções (gráfica, personalizados, uniformes,
serviços digitais, assessoria jurídica e documental e Ponto de Retirada Mercado Livre).
Sem venda on-line: o visitante monta um orçamento e envia pelo WhatsApp.

- **Site:** `index.html` (HTML + CSS + JS puro, rotas por hash `#/catalogo` etc.).
- **Conteúdo editável:** `dados/produtos.json` e `dados/conteudo.json`, editados pela Joice no
  painel **[Pages CMS](https://app.pagescms.org)** (configuração em `.pages.yml`). Fotos em `fotos/`.
- **Publicação:** GitHub Actions → **Azure Static Web Apps (plano Free)**.

Guia para quem edita o conteúdo: **[COMO-EDITAR.md](COMO-EDITAR.md)**.

## Como funciona

```
Joice edita no Pages CMS ──► commit na branch main (dados/*.json, fotos/*)
                                     │
                     GitHub Actions: .github/workflows/publicar-site.yml
                                     │  npm ci && npm run build
                                     │   • valida os JSON (se quebrado, NÃO publica; o site anterior continua no ar)
                                     │   • embute os dados no index.html (linha `const DADOS_PAINEL = null;`)
                                     │   • reduz fotos para no máx. 1600 px e comprime
                                     ▼
                              dist/ ──► Azure Static Web Apps
```

- Não há backend, banco nem login de visitante. O acesso de edição é controlado pelo GitHub:
  só quem tem permissão de escrita no repositório consegue salvar pelo painel.
- O objeto `CONFIG` dentro do `index.html` é a **reserva**: é usado ao abrir o arquivo direto no
  computador ou se os dados do painel faltarem. No site publicado valem os dados do painel.
- Serviços, textos das abas e a lista de catálogos/categorias continuam no `index.html`
  (mudam raramente). Se criar um catálogo ou categoria novos, atualize também as opções em `.pages.yml`.

## Configuração (uma vez só)

### 1. Azure Static Web Apps (≈5 min)

1. Portal da Azure → **Create a resource → Static Web App**.
2. Plano **Free**. Em *Deployment details*, escolha **Other** (o workflow já está neste repositório;
   assim a Azure não cria um segundo).
3. Depois de criado: **Overview → Manage deployment token** → copie o token.
4. No GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - Nome: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Valor: o token copiado.
5. Faça merge na `main` (ou **Actions → Publicar site → Run workflow**). Em ~2 min o site está em
   `https://<nome>.azurestaticapps.net`.

Sem o segredo, o workflow apenas valida e monta o site (aviso no log), sem publicar.

**Domínio próprio:** Static Web App → *Custom domains* → *Add*. Para `www`, crie um CNAME apontando
para `<nome>.azurestaticapps.net`; para o domínio raiz, siga a validação TXT/ALIAS indicada pelo portal.
Depois, preencha `urlSite` no `CONFIG` do `index.html` e troque `og-image.png` no `<head>` pelo
endereço completo (imagem de compartilhamento no WhatsApp/Facebook).

### 2. Painel Pages CMS (≈5 min, feito pela Joice)

1. A conta GitHub dela precisa ter **permissão de escrita** neste repositório
   (dona do repositório ou colaboradora).
2. Ativar a **verificação em duas etapas** no GitHub (Settings → Password and authentication).
3. Acessar <https://app.pagescms.org> → **Sign in with GitHub** → instalar o app do Pages CMS
   escolhendo **Only select repositories** → este repositório.
4. Abrir o repositório, branch `main`. Aparecem **Produtos do catálogo** e **Informações do site**.

Atalho: `https://<site>/admin` redireciona para o painel (`staticwebapp.config.json`).

> Não exija aprovação de pull request na `main` (branch protection com revisão obrigatória):
> o painel salva direto na `main` e o salvamento falharia.

## Desenvolvimento local

```bash
npm ci
npm run build          # gera dist/
npx serve dist         # ou: python3 -m http.server -d dist
```

Abrir o `index.html` direto no navegador também funciona (usa o `CONFIG` de reserva).

## Desfazer uma alteração

Cada salvamento do painel é um commit. Para voltar atrás: reverta o commit no GitHub
(`git revert <commit>`) — o site é republicado automaticamente.

## Estrutura

| Caminho | O que é |
|---|---|
| `index.html` | O site inteiro (layout, lógica, `CONFIG` de reserva) |
| `dados/produtos.json` | Produtos do catálogo (editado pelo painel) |
| `dados/conteudo.json` | Aviso, contatos, horários, feriados, pagamento, galeria, depoimentos, dúvidas |
| `fotos/` | Fotos enviadas pelo painel (originais; a versão publicada é otimizada) |
| `.pages.yml` | Formulários do painel Pages CMS |
| `scripts/build.mjs` | Valida dados, embute no HTML e otimiza fotos → `dist/` |
| `staticwebapp.config.json` | Redirecionamento `/admin`, cabeçalhos e cache no Azure SWA |
| `.github/workflows/publicar-site.yml` | Build + publicação no Azure SWA |
| `og-image.png` | Imagem de compartilhamento (1200×630) |
