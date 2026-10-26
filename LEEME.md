# Página de la boda — cómo publicarla gratis

```
site/            ← la página web (esto es lo que se publica)
  index.html, styles.css, app.js, config.js, img/
apps-script/
  Code.gs        ← el "backend" que lee/escribe el Google Sheets
```

## 1. Conectar el Google Sheets (Apps Script, gratis)

1. Abre el Sheets **Bodita master file** → **Extensiones → Apps Script**.
2. Borra lo que haya en `Código.gs` y pega todo el contenido de `apps-script/Code.gs`. Guarda.
3. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
4. Autoriza los permisos (Google avisará que la app "no está verificada": *Configuración avanzada → Ir a…*; es tu propio script).
5. Copia la URL que termina en `/exec` y pégala en `site/config.js`:
   ```js
   window.RSVP_CONFIG = { API_URL: 'https://script.google.com/macros/s/XXXX/exec' };
   ```
6. Prueba: abre `https://…/exec?action=buscar&codigo=FAMOLO321` en el navegador; debe mostrar la familia y sus integrantes.

> Si cambias `Code.gs` después, usa **Implementar → Gestionar implementaciones → editar (lápiz) → Versión: nueva** para que la URL siga siendo la misma.

## 2. Publicar la página (elige una)

- **GitHub Pages**:
  1. Crea un repositorio **público** en https://github.com (p. ej. `boda`).
  2. *Add file → Upload files* y arrastra **el contenido** de `site/` (`index.html`, `styles.css`, `app.js`, `config.js` y la carpeta `img`) → *Commit changes*.
  3. *Settings → Pages* → Branch `main`, carpeta `/ (root)` → *Save*.
  4. Queda en `https://tu-usuario.github.io/boda/`. Para actualizar, vuelve a subir los archivos cambiados.
- **Netlify Drop**: entra a https://app.netlify.com/drop y arrastra la carpeta `site`. Para actualizar, arrástrala de nuevo en la pestaña *Deploys* del mismo sitio.
- **Cloudflare Pages**: *Create → Pages → Upload assets* y sube la carpeta `site`.

## Qué se guarda en el Sheets

| Hoja | Qué escribe la página |
|---|---|
| **Invitados** | Columna E *Integrantes confirmados* con los nombres que asisten (la F los cuenta con tu fórmula). |
| **Respuestas** | Una fila por grupo: Fecha, Grupo, Respuesta (*Asiste* / *No asiste*), Asistentes (nombres), Personas (número), Menús. |
| **Menú** | Una fila por persona que asiste: Invitado, Tipo Menú (*Tradicional* / *Vegetariano*). |

- Si un grupo vuelve a confirmar, su fila en **Respuestas** y sus filas en **Menú** se reemplazan (no se duplican).
- Los acompañantes llamados "Invitado" se guardan en Menú como *Invitado de &lt;primer integrante&gt;*.
- Puedes mandar enlaces directos: `https://tu-pagina/?codigo=FAMOLO321#rsvp` abre la invitación ya cargada.

## Probar en tu computadora

Con `config.js` vacío, la página funciona en **modo demo** con el código `DEMO123` (no guarda nada).

## Pendientes del diseño

Textos entre corchetes que faltan: `[Hotel sugerido]`, `[CÓDIGO]`, `[fecha límite]`, `[Tienda 1]`, `[Tienda 2]` y la nota de vestimenta — en `site/index.html`.
