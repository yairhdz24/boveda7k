# Bóveda · landing

Rama `landing` del repo [boveda7k](https://github.com/yairhdz24/boveda7k): solo contiene el sitio público, https://getboveda.vercel.app. La app vive en `main`.

- `site/`: lo que se publica (HTML, JS, CSS compilado y medios). Sin rastreadores ni scripts de terceros.
- `src/landing.css`: estilos fuente (Tailwind v4).
- `vercel.json`: cabeceras de seguridad y configuración del despliegue.

```bash
npm run build:css   # compila el CSS y sella index.html con el hash de css y js
npm run preview     # http://localhost:4173
```

Cada push a esta rama se despliega solo en Vercel.
