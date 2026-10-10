/**
 * Monta a versão publicada do site na pasta dist/.
 *
 * 1. Valida dados/produtos.json e dados/conteudo.json (editados pelo painel Pages CMS).
 *    Se um JSON estiver quebrado, a publicação para e o site no ar continua o anterior.
 * 2. Copia o index.html embutindo esses dados (linha "const DADOS_PAINEL = null;").
 * 3. Copia as fotos de fotos/ redimensionadas (máx. 1600 px) e comprimidas.
 *
 * Uso: npm run build
 */
import { readFile, writeFile, mkdir, rm, readdir, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'dist');
const MARKER = 'const DADOS_PAINEL = null;';
const MAX_PX = 1600;
const avisos = [];

async function exists(p) { try { await access(p); return true; } catch { return false; } }

async function readJson(rel) {
  const raw = await readFile(path.join(ROOT, rel), 'utf8');
  try { return JSON.parse(raw); }
  catch (err) { throw new Error(`${rel} não é um JSON válido: ${err.message}`); }
}

function validar(produtos, conteudo) {
  if (!produtos || !Array.isArray(produtos.produtos)) throw new Error('dados/produtos.json precisa ter a lista "produtos".');
  if (!conteudo || typeof conteudo !== 'object' || Array.isArray(conteudo)) throw new Error('dados/conteudo.json precisa ser um objeto.');
  produtos.produtos.forEach((p, i) => {
    if (!p || !p.nome) avisos.push(`Produto #${i + 1} sem nome (será ignorado no site).`);
    else if (!p.catalogo || (Array.isArray(p.catalogo) && !p.catalogo.length)) avisos.push(`Produto "${p.nome}" sem catálogo (será ignorado no site).`);
  });
}

/* Fotos usadas nos dados que não existem na pasta fotos/ */
async function conferirFotos(produtos, conteudo) {
  const usadas = [];
  produtos.produtos.forEach(p => p && p.imagem && usadas.push(p.imagem));
  (conteudo.galeria || []).forEach(g => g && g.imagem && usadas.push(g.imagem));
  for (const img of usadas) {
    if (/^(https?:|data:)/i.test(img)) continue;
    const rel = img.replace(/^\/+/, '');
    if (!(await exists(path.join(ROOT, rel)))) avisos.push(`Foto não encontrada: ${img} (o site mostra o desenho padrão).`);
  }
}

async function otimizarFotos(dir, destino) {
  if (!(await exists(dir))) return 0;
  await mkdir(destino, { recursive: true });
  let total = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const src = path.join(dir, entry.name);
    const dst = path.join(destino, entry.name);
    if (entry.isDirectory()) { total += await otimizarFotos(src, dst); continue; }
    const ext = path.extname(entry.name).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) { await copyFile(src, dst); continue; }
    try {
      let img = sharp(src, { failOn: 'none' }).rotate().resize({ width: MAX_PX, height: MAX_PX, fit: 'inside', withoutEnlargement: true });
      if (ext === '.png') img = img.png({ compressionLevel: 9, palette: true });
      else if (ext === '.webp') img = img.webp({ quality: 80 });
      else img = img.jpeg({ quality: 80, mozjpeg: true });
      await img.toFile(dst);
      total++;
    } catch (err) {
      avisos.push(`Não consegui otimizar ${entry.name} (${err.message}); copiada sem alteração.`);
      await copyFile(src, dst);
    }
  }
  return total;
}

async function main() {
  const produtos = await readJson('dados/produtos.json');
  const conteudo = await readJson('dados/conteudo.json');
  validar(produtos, conteudo);
  await conferirFotos(produtos, conteudo);

  let html = await readFile(path.join(ROOT, 'index.html'), 'utf8');
  if (!html.includes(MARKER)) throw new Error(`index.html não contém a linha "${MARKER}".`);
  /* JSON seguro dentro de <script>: "<" vira a sequência de escape \u003c (impede fechar a tag por engano) */
  const LS = new RegExp(String.fromCharCode(0x2028), 'g');
  const PS = new RegExp(String.fromCharCode(0x2029), 'g');
  const json = JSON.stringify({ produtos, conteudo })
    .replace(/</g, '\\u003c').replace(LS, '\\u2028').replace(PS, '\\u2029');
  html = html.replace(MARKER, () => `const DADOS_PAINEL = ${json};`);

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, 'index.html'), html);
  for (const f of ['og-image.png', 'staticwebapp.config.json']) {
    if (await exists(path.join(ROOT, f))) await copyFile(path.join(ROOT, f), path.join(OUT, f));
  }
  const n = await otimizarFotos(path.join(ROOT, 'fotos'), path.join(OUT, 'fotos'));

  console.log(`✔ Site montado em dist/ — ${produtos.produtos.length} produtos, ${n} foto(s) otimizada(s).`);
  avisos.forEach(a => console.warn(`⚠ ${a}`));
}

main().catch(err => { console.error(`✖ Publicação interrompida: ${err.message}`); process.exit(1); });
