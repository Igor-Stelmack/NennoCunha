# Nenno Cunha Tattoo Studio — Curitiba (prévia)

Página única com:
- tela de carregamento customizada (contador + selo da tatuadora);
- hero com caneta de tatuagem 3D (three.js, gerada em código, sem modelos externos);
- introdução com scroll interativo (GSAP ScrollTrigger + Lenis): a caneta dá zoom e depois desenha um punhal ornamental fine line, levantando a agulha entre os traços.

Cores: base branco e preto; detalhes dourados em `--accent` no topo do `style.css`.

Rodar localmente: `python3 -m http.server` e abrir http://localhost:8000.
Tudo é estático (bibliotecas em `vendor/`), dá para publicar direto na Vercel/Netlify/GitHub Pages.
