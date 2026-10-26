# Página de la boda

```
docs/            ← LA PÁGINA WEB (lo que se publica). Se llama "docs" porque GitHub Pages lo pide así.
  index.html       textos y secciones
  styles.css       colores y estilos
  app.js           lógica de la confirmación
  config.js        aquí va la URL del Google Sheets
  img/             fotos de la página
google-sheets/
  Code.gs        ← código que se pega en Apps Script del Sheets
diseno/          ← material de referencia (no se publica)
LEEME.md
```

Repositorio: https://github.com/chavmoreno/PROYECTO_BODA
Página: **https://chavmoreno.github.io/PROYECTO_BODA/**

## 1. Conectar el Google Sheets (una sola vez)

1. Abre el Sheets **Bodita master file** → **Extensiones → Apps Script**.
2. Borra lo que haya y pega todo el contenido de `google-sheets/Code.gs`. Guarda.
3. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
4. Autoriza los permisos (Google avisará que la app "no está verificada": *Configuración avanzada → Ir a…*; es tu propio script).
5. Copia la URL que termina en `/exec` y pégala en `docs/config.js`:
   ```js
   window.RSVP_CONFIG = { API_URL: 'https://script.google.com/macros/s/XXXX/exec' };
   ```
6. Prueba: abre `https://…/exec?action=buscar&codigo=FAMOLO321`; debe mostrar la familia y sus integrantes.

## 2. Activar GitHub Pages (una sola vez)

1. Haz commit y push de todo (GitHub Desktop: mensaje → **Commit to main** → **Push origin**).
2. En GitHub: **Settings → Pages → Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main** · carpeta **/docs** → **Save**
3. En 1–2 min la página está en https://chavmoreno.github.io/PROYECTO_BODA/

> GitHub Pages gratis requiere repositorio **público**: todo lo que subas (incluida `diseno/`) es visible en GitHub, aunque solo `docs/` se publica como página. La lista de invitados no está aquí; vive en el Sheets.

## 3. Cuando hagas cambios

| Qué cambiaste | Qué hacer |
|---|---|
| Algo en `docs/` | Commit + push. Se publica solo en 1–2 min. Si no ves el cambio, Ctrl + F5. |
| `google-sheets/Code.gs` | Pégalo en Apps Script → **Implementar → Gestionar implementaciones → lápiz ✏️ → Versión: Nueva versión → Implementar**. La URL no cambia. ⚠️ No uses "Nueva implementación" (crea otra URL). |
| Invitados, nombres o códigos en el Sheets | Nada: la página los lee en el momento. |
| Nombres de hojas u orden de columnas | Hay que ajustar `Code.gs`. |

## Qué se guarda en el Sheets

| Hoja | Qué escribe la página |
|---|---|
| **Invitados** | Columna E *Integrantes confirmados* con los nombres que asisten (la F los cuenta). |
| **Respuestas** | Una fila por grupo: Fecha, Grupo, Respuesta (*Asiste* / *No asiste*), Asistentes (nombres), Personas (número), Menús. |
| **Menú** | Una fila por persona que asiste: Invitado, Tipo Menú (*Tradicional* / *Vegetariano*). |

- Si un grupo vuelve a confirmar, su respuesta se reemplaza (no se duplica).
- Los acompañantes llamados "Invitado" se guardan en Menú como *Invitado de &lt;primer integrante&gt;*.
- Enlace directo por grupo: `https://chavmoreno.github.io/PROYECTO_BODA/?codigo=FAMOLO321#rsvp`

## Probar en tu computadora

Con `config.js` vacío, la página funciona en **modo demo** con el código `DEMO123` (no guarda nada). Con la URL real, las pruebas **sí** escriben en el Sheets.

## Pendientes del diseño

Textos entre corchetes en `docs/index.html`: `[Hotel sugerido]`, `[CÓDIGO]`, `[fecha límite]`, `[Tienda 1]`, `[Tienda 2]` y la nota de vestimenta.
