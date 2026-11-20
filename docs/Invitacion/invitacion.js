// Invitación personalizada: lee ?codigo=XXX, pide el grupo al Apps Script
// (el mismo que usa la confirmación) y lo escribe sobre el diseño.
// Como los datos se leen del Sheets en el momento, el enlace sigue funcionando
// aunque cambies el nombre del grupo o sus integrantes.
(function () {
  var API_URL = (window.RSVP_CONFIG && window.RSVP_CONFIG.API_URL) || '';
  var inv = document.getElementById('invitacion');
  var nombre = document.getElementById('inv-nombre');
  var codigoEl = document.getElementById('inv-codigo');
  var btnConfirmar = document.getElementById('btn-confirmar');
  var aviso = document.getElementById('aviso');
  var acciones = document.getElementById('acciones');

  function leerCodigo() {
    var m = (location.search + location.hash).match(/codigo=([A-Za-z0-9]+)/);
    return m ? m[1].toUpperCase() : '';
  }

  function buscar(codigo) {
    if (!API_URL) {
      return Promise.resolve(codigo === 'DEMO123'
        ? { ok: true, codigo: codigo, grupo: 'Familia Demo' }
        : { ok: false, error: 'No encontramos ese código. (Modo demo: usa DEMO123)' });
    }
    return fetch(API_URL + '?action=buscar&codigo=' + encodeURIComponent(codigo))
      .then(function (r) { return r.json(); });
  }

  // Achica la letra si el nombre del grupo no cabe en la tarjeta.
  function ajustar() {
    nombre.style.fontSize = '';
    var tam = parseFloat(getComputedStyle(nombre).fontSize);
    var min = tam * 0.55;
    while ((nombre.scrollHeight > nombre.clientHeight + 1 || nombre.scrollWidth > nombre.clientWidth + 1) && tam > min) {
      tam -= 1;
      nombre.style.fontSize = tam + 'px';
    }
  }

  function mostrar(datos) {
    var destino = '../?codigo=' + encodeURIComponent(datos.codigo) + '#rsvp';
    inv.dataset.estado = 'listo';
    nombre.textContent = datos.grupo;
    codigoEl.textContent = datos.codigo;
    btnConfirmar.href = destino;
    aviso.hidden = true;
    acciones.hidden = false;
    document.title = 'Invitación para ' + datos.grupo + ' · Ana & Salvador';
    ajustar();
  }

  function error(texto) {
    inv.dataset.estado = 'error';
    nombre.textContent = '';
    codigoEl.textContent = '';
    aviso.textContent = texto;
    aviso.hidden = false;
    acciones.hidden = true;
  }

  function cargar(codigo) {
    inv.dataset.estado = 'cargando';
    nombre.textContent = 'Cargando…';
    codigoEl.textContent = '';
    return buscar(codigo).then(function (r) {
      if (r && r.ok) mostrar(r);
      else error((r && r.error) || 'No encontramos esta invitación. Ábrela desde el enlace que te enviamos o escríbenos.');
    }).catch(function () {
      error('No pudimos cargar tu invitación. Revisa tu conexión e inténtalo de nuevo.');
    });
  }

  window.addEventListener('resize', function () { if (inv.dataset.estado === 'listo') ajustar(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (inv.dataset.estado === 'listo') ajustar(); });

  var codigo = leerCodigo();
  if (codigo) cargar(codigo);
  else error('Abre tu invitación desde el enlace que te enviamos.');
})();
