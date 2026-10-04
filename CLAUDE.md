# Modelo de site para tatuadores/estúdios (prévia)

Este repositório é o **modelo** usado para fazer prévias de site para estúdios de tatuagem.
A versão atual está adaptada para o **Nenno Cunha Tattoo Studio (Curitiba, PR)**.
Cada cliente tem o próprio repositório no GitHub (Daedra: `siteprastatuadoras`; Nenno Cunha: `nennocunha`).
Para um cliente novo, adapte este modelo; não comece do zero.

## O que é
Página única estática (sem build), publicada na Vercel:
- `index.html` — estrutura e todos os textos.
- `style.css` — layout; cor da marca em `--accent` / `--accent-light` no topo.
- `main.js` — caneta de tatuagem 3D (three.js, gerada em código), tela de carregamento e timeline de scroll (GSAP ScrollTrigger + Lenis).
- `vendor/` — bibliotecas locais (não usar CDN).

Fluxo: tela de carregamento (contador 0–100) → hero (nome à esquerda, caneta no centro, sigla grande à direita, aviso "Role para baixo para descobrir mais") → zoom da caneta com texto → a agulha desenha uma ilustração fine line (SVG) com atributos ao redor → final "Sua pele. Nossa arte." + botão "Agendar sessão".

## Como adaptar para um novo cliente
1. **Nome e textos** (`index.html`): `<title>`, meta description, selo do loader, logo do nav, hero (título, subtítulo, sigla grande — ex.: "CWB" — e as duas linhas de baixo), beat1, atributos, final. Não inventar números (anos, quantidade de tatuagens): usar textos neutros se não souber.
2. **Gravação na caneta** (`main.js`, função `makeLabelTexture`): nome + cidade.
3. **Cor da marca** (`style.css`): `--accent` (e `--accent-light` para o fundo preto do loader).
4. **Desenho traçado pela agulha** (`index.html`, dentro de `#artSvg`, viewBox 400×500): cada `<path class="art__path">` é um traço; a agulha levanta entre eles. `art__path--acc` usa a cor da marca. Escolher algo ligado ao nome/estilo do estúdio (Crâne = caveira).
5. **Links**: "Instagram" e "Agendar"/"Agendar sessão" ainda são `href="#"` — trocar pelo @ e WhatsApp do cliente.
6. Testar desktop (1600×900 e 1280×720) e celular (390×844) com screenshots antes de publicar.

Rodar local: `python3 -m http.server` e abrir http://localhost:8000.

## Histórico
- 1ª versão: "Luna Moraes" (tatuadora fictícia, desenho de rosa) — ver o histórico do git.
- Crâne Tattoo Studio: caveira fine line, detalhes em verde `#2f7d57`.
- Daedra Tattoo (Flavia Carvalho, @daedracwb, WhatsApp 41 99883-7314): base branco e preto, detalhes em turquesa `#12908a` (`--accent`) e rosa `#e2508a` (`--accent-2`, classe `art__path--acc2`); desenho de borboleta + coração. Proposta: https://claude.ai/artifact/UK5XkfQNtrmm7TdP1LSPiS
- Nenno Cunha Tattoo Studio (@nennocunha.tattoo, WhatsApp 41 99969-5805, R. Antônio Lago 70, Boa Vista; realismo preto e cinza e fine line, desde 2005): base branco e preto, detalhes dourados `#9c7a3c` (do logo NC); sigla "NC"; desenho de punhal ornamental.
- Bug corrigido: o centro do desenho (`#art`) é posicionado só pelo GSAP (`xPercent/yPercent -50`); não colocar `transform` no CSS do `.art`.

## Proposta comercial
Modelo de proposta (4 páginas A4, Ville Holdings) em: https://claude.ai/artifact/SGMfkLmuuBkevbJqu3ubyp
Páginas: capa · por que ter um site · materiais e processo · investimento (R$ 649 Pix / R$ 689 cartão).
Para cada cliente novo, criar um canvas novo (cópia) e não sobrescrever o modelo. O que muda por cliente:
- Página 1: "CLIENTE", "LOCAL", "DATA" e o nome no parágrafo "Olá!".
- Páginas 2–4: cabeçalho "PROPOSTA · <NOME DO ESTÚDIO>".
- Página 4: "Vamos colocar o <nome> no ar?".
- Cor `accent` (padrão dourado `#B08D57`), opcional: pode puxar a cor da marca do cliente.
