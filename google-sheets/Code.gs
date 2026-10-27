/**
 * Backend de la página de la boda (Google Apps Script).
 *
 * Pégalo en Apps Script (desde el Sheets: Extensiones → Apps Script, o en un
 * proyecto nuevo de script.google.com) y publícalo como
 * "Aplicación web" (Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario).
 *
 *   GET  ?action=buscar&codigo=XXX   → devuelve el grupo y sus integrantes
 *   POST {codigo, respuestas:[{nombre, asiste, menu}]} → guarda la confirmación
 */

var HOJA_INVITADOS = 'Invitados';
var HOJA_RESPUESTAS = 'Respuestas';
var HOJA_MENU = 'Menú';
var MENUS = ['Tradicional', 'Vegetariano'];

// Funciona pegado dentro del Sheets o como proyecto aparte en script.google.com.
var SHEET_ID = '1-cX6IkeMpuIa4XkZYRq0tctZPNNvjsz9w-VELu1mMR8';

function libro_() {
  return SpreadsheetApp.getActive() || SpreadsheetApp.openById(SHEET_ID);
}

// Límite contra quien intente adivinar códigos: si hay demasiados códigos
// equivocados en poco tiempo, se pausan las búsquedas unos minutos.
var MAX_FALLOS = 40;
var VENTANA_SEG = 600;
var MAX_CUERPO = 5000;
var ERROR_GENERICO = 'Algo salió mal. Inténtalo de nuevo en unos minutos.';

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.action === 'buscar') return json_(buscarGrupo_(p.codigo));
    return json_({ ok: false, error: 'Acción no válida.' });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: ERROR_GENERICO });
  }
}

function doPost(e) {
  var datos;
  try {
    var cuerpo = (e && e.postData && e.postData.contents) || '';
    if (cuerpo.length > MAX_CUERPO) return json_({ ok: false, error: 'Datos inválidos.' });
    datos = JSON.parse(cuerpo);
  } catch (err) {
    return json_({ ok: false, error: 'Datos inválidos.' });
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json_({ ok: false, error: ERROR_GENERICO });
  try {
    return json_(guardar_(datos));
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: ERROR_GENERICO });
  } finally {
    lock.releaseLock();
  }
}

function buscarGrupo_(codigo) {
  var cache = CacheService.getScriptCache();
  var fallos = Number(cache.get('fallos') || 0);
  if (fallos >= MAX_FALLOS) return { ok: false, error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' };
  var g = encontrarGrupo_(codigo);
  if (!g) {
    cache.put('fallos', String(fallos + 1), VENTANA_SEG);
    return { ok: false, error: 'No encontramos ese código. Revísalo en tu invitación.' };
  }
  return { ok: true, codigo: g.codigo, grupo: g.grupo, integrantes: g.integrantes, previas: respuestasPrevias_(g) };
}

function encontrarGrupo_(codigo) {
  codigo = String(codigo || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(codigo)) return null;
  var hoja = libro_().getSheetByName(HOJA_INVITADOS);
  var filas = hoja.getRange(2, 1, Math.max(hoja.getLastRow() - 1, 1), 3).getValues();
  for (var i = 0; i < filas.length; i++) {
    if (String(filas[i][0]).trim().toUpperCase() === codigo) {
      return {
        fila: i + 2,
        codigo: codigo,
        grupo: String(filas[i][1]).trim(),
        integrantes: separar_(filas[i][2])
      };
    }
  }
  return null;
}

// Si el grupo ya respondió, devuelve lo que eligió para precargar el formulario.
function respuestasPrevias_(g) {
  var hoja = libro_().getSheetByName(HOJA_INVITADOS);
  var confirmados = separar_(hoja.getRange(g.fila, 5).getValue());
  if (!filaRespuesta_(g.grupo)) return null;
  var menus = {};
  var hojaMenu = libro_().getSheetByName(HOJA_MENU);
  if (hojaMenu.getLastRow() > 1) {
    hojaMenu.getRange(2, 1, hojaMenu.getLastRow() - 1, 2).getValues().forEach(function (r) {
      menus[String(r[0]).trim()] = String(r[1]).trim();
    });
  }
  return g.integrantes.map(function (nombre) {
    var asiste = confirmados.indexOf(nombre) !== -1;
    return { nombre: nombre, asiste: asiste, menu: asiste ? (menus[etiqueta_(g, nombre)] || '') : '' };
  });
}

function guardar_(datos) {
  if (!datos || typeof datos !== 'object' || !Array.isArray(datos.respuestas)) return { ok: false, error: 'Datos inválidos.' };
  var g = encontrarGrupo_(datos.codigo);
  if (!g) return { ok: false, error: 'Código no válido.' };

  // Solo se aceptan los integrantes que están en el Sheets; lo demás se ignora.
  var porNombre = Object.create(null);
  datos.respuestas.forEach(function (r) {
    if (r && typeof r === 'object' && typeof r.nombre === 'string') porNombre[r.nombre] = r;
  });

  var asistentes = [];
  var menus = [];
  for (var i = 0; i < g.integrantes.length; i++) {
    var nombre = g.integrantes[i];
    var r = porNombre[nombre];
    if (!r || typeof r.asiste !== 'boolean') return { ok: false, error: 'Falta indicar si asiste ' + nombre + '.' };
    if (r.asiste) {
      if (MENUS.indexOf(r.menu) === -1) return { ok: false, error: 'Falta elegir el menú de ' + nombre + '.' };
      asistentes.push(nombre);
      menus.push([etiqueta_(g, nombre), r.menu]);
    }
  }

  var ss = libro_();

  // Invitados: columna E "Integrantes confirmados" (la F la cuenta con su fórmula).
  ss.getSheetByName(HOJA_INVITADOS).getRange(g.fila, 5).setValue(asistentes.join(' ; '));

  // Respuestas: una fila por grupo; si vuelve a responder se actualiza.
  var hojaResp = ss.getSheetByName(HOJA_RESPUESTAS);
  var fila = [
    new Date(),
    g.grupo,
    asistentes.length ? 'Asiste' : 'No asiste',
    asistentes.join(' ; '),
    asistentes.length,
    menus.map(function (m) { return m[0] + ': ' + m[1]; }).join(' ; ')
  ];
  var existente = filaRespuesta_(g.grupo);
  if (existente) hojaResp.getRange(existente, 1, 1, fila.length).setValues([fila]);
  else hojaResp.appendRow(fila);

  // Menú: borra las filas anteriores de este grupo y agrega las nuevas.
  var hojaMenu = ss.getSheetByName(HOJA_MENU);
  if (hojaMenu.getLastRow() > 1) {
    var etiquetas = g.integrantes.map(function (n) { return etiqueta_(g, n); });
    var nombres = hojaMenu.getRange(2, 1, hojaMenu.getLastRow() - 1, 1).getValues();
    for (var f = nombres.length - 1; f >= 0; f--) {
      if (etiquetas.indexOf(String(nombres[f][0]).trim()) !== -1) hojaMenu.deleteRow(f + 2);
    }
  }
  if (menus.length) hojaMenu.getRange(hojaMenu.getLastRow() + 1, 1, menus.length, 2).setValues(menus);

  return { ok: true, grupo: g.grupo, asistentes: asistentes.length, total: g.integrantes.length };
}

function filaRespuesta_(grupo) {
  var hoja = libro_().getSheetByName(HOJA_RESPUESTAS);
  if (hoja.getLastRow() < 2) return 0;
  var grupos = hoja.getRange(2, 2, hoja.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < grupos.length; i++) {
    if (String(grupos[i][0]).trim() === grupo) return i + 2;
  }
  return 0;
}

// Los acompañantes sin nombre ("Invitado") se repiten entre grupos; en la hoja
// Menú se guardan como "Invitado de <primer integrante>" para no confundirlos.
function etiqueta_(g, nombre) {
  return nombre.toLowerCase() === 'invitado' ? 'Invitado de ' + g.integrantes[0] : nombre;
}

function separar_(texto) {
  return String(texto || '').split(';').map(function (s) { return s.trim(); }).filter(String);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
