(function () {
  var API_URL = (window.RSVP_CONFIG && window.RSVP_CONFIG.API_URL) || '';

  var formCodigo = document.getElementById('form-codigo');
  var inputCodigo = document.getElementById('rsvp-codigo');
  var errorCodigo = document.getElementById('codigo-error');
  var formInvitados = document.getElementById('form-invitados');
  var lista = document.getElementById('lista-invitados');
  var errorInvitados = document.getElementById('invitados-error');
  var grupoNombre = document.getElementById('grupo-nombre');
  var gracias = document.getElementById('rsvp-gracias');
  var graciasTexto = document.getElementById('gracias-texto');
  var tpl = document.getElementById('tpl-invitado');

  // Estado: código buscado y la respuesta de cada integrante.
  var actual = null;

  // ---- API ----
  function buscar(codigo) {
    if (!API_URL) return demoBuscar(codigo);
    return fetch(API_URL + '?action=buscar&codigo=' + encodeURIComponent(codigo))
      .then(function (r) { return r.json(); });
  }

  function guardar(datos) {
    if (!API_URL) return new Promise(function (ok) { setTimeout(function () { ok({ ok: true }); }, 600); });
    // text/plain evita la petición previa de CORS que Apps Script no soporta.
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(datos)
    }).then(function (r) { return r.json(); });
  }

  function demoBuscar(codigo) {
    return new Promise(function (ok) {
      setTimeout(function () {
        if (codigo === 'DEMO123') ok({ ok: true, codigo: codigo, grupo: 'Familia Demo', integrantes: ['Invitada Uno', 'Invitado Dos', 'Invitado'], previas: null });
        else ok({ ok: false, error: 'No encontramos ese código. Revísalo en tu invitación. (Modo demo: usa DEMO123)' });
      }, 500);
    });
  }

  // ---- UI ----
  function mostrarError(el, msg) {
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  function cargando(form, si, texto) {
    var btn = form.querySelector('button[type="submit"]');
    if (!btn.dataset.texto) btn.dataset.texto = btn.textContent;
    btn.disabled = si;
    btn.textContent = si ? texto : btn.dataset.texto;
  }

  function mostrarPaso(paso) {
    formCodigo.hidden = paso !== 'codigo';
    formInvitados.hidden = paso !== 'invitados';
    gracias.hidden = paso !== 'gracias';
  }

  function marcar(grupo, valor) {
    grupo.querySelectorAll('.opcion').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.valor === valor));
    });
  }

  function pintarInvitados(datos) {
    grupoNombre.textContent = datos.grupo;
    lista.innerHTML = '';
    actual.respuestas = datos.integrantes.map(function (nombre, i) {
      var previa = datos.previas && datos.previas[i];
      var r = { nombre: nombre, asiste: previa ? previa.asiste : null, menu: previa ? previa.menu : '' };
      var nodo = tpl.content.firstElementChild.cloneNode(true);
      var opAsiste = nodo.querySelector('[data-campo="asiste"]');
      var opMenu = nodo.querySelector('[data-campo="menu"]');
      var menu = nodo.querySelector('.menu');
      nodo.querySelector('.invitado-nombre').textContent = nombre.toLowerCase() === 'invitado' ? 'Tu acompañante' : nombre;

      function refrescar() {
        marcar(opAsiste, r.asiste === null ? '' : (r.asiste ? 'si' : 'no'));
        marcar(opMenu, r.menu);
        menu.hidden = r.asiste !== true;
      }
      opAsiste.addEventListener('click', function (e) {
        var b = e.target.closest('.opcion'); if (!b) return;
        r.asiste = b.dataset.valor === 'si';
        if (!r.asiste) r.menu = '';
        nodo.classList.remove('falta');
        refrescar();
      });
      opMenu.addEventListener('click', function (e) {
        var b = e.target.closest('.opcion'); if (!b) return;
        r.menu = b.dataset.valor;
        nodo.classList.remove('falta');
        refrescar();
      });
      refrescar();
      r.nodo = nodo;
      lista.appendChild(nodo);
      return r;
    });
  }

  formCodigo.addEventListener('submit', function (e) {
    e.preventDefault();
    var codigo = inputCodigo.value.trim().toUpperCase();
    if (!codigo) { mostrarError(errorCodigo, 'Escribe el código de tu invitación.'); inputCodigo.focus(); return; }
    mostrarError(errorCodigo, '');
    cargando(formCodigo, true, 'Buscando…');
    buscar(codigo)
      .then(function (datos) {
        if (!datos.ok) { mostrarError(errorCodigo, datos.error); return; }
        actual = { codigo: datos.codigo };
        pintarInvitados(datos);
        mostrarError(errorInvitados, '');
        mostrarPaso('invitados');
        grupoNombre.scrollIntoView({ behavior: 'smooth', block: 'center' });
      })
      .catch(function () { mostrarError(errorCodigo, 'No pudimos conectar. Revisa tu internet e inténtalo de nuevo.'); })
      .then(function () { cargando(formCodigo, false); });
  });

  formInvitados.addEventListener('submit', function (e) {
    e.preventDefault();
    var faltan = actual.respuestas.filter(function (r) { return r.asiste === null || (r.asiste && !r.menu); });
    actual.respuestas.forEach(function (r) { r.nodo.classList.toggle('falta', faltan.indexOf(r) !== -1); });
    if (faltan.length) {
      mostrarError(errorInvitados, 'Indica si asiste cada persona y, si asiste, su menú.');
      faltan[0].nodo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    mostrarError(errorInvitados, '');
    cargando(formInvitados, true, 'Guardando…');
    var datos = {
      codigo: actual.codigo,
      respuestas: actual.respuestas.map(function (r) { return { nombre: r.nombre, asiste: r.asiste, menu: r.menu }; })
    };
    guardar(datos)
      .then(function (res) {
        if (!res.ok) { mostrarError(errorInvitados, res.error || 'No pudimos guardar tu respuesta.'); return; }
        var van = actual.respuestas.filter(function (r) { return r.asiste; }).length;
        graciasTexto.textContent = 'Tus datos se guardaron correctamente. ' + (van
          ? (van === 1 ? 'Confirmaste 1 asistente.' : 'Confirmaste ' + van + ' asistentes.') + ' ¡Nos vemos en la pista de baile!'
          : 'Gracias por avisarnos. Te vamos a extrañar y celebraremos pensando en ti.');
        mostrarPaso('gracias');
        gracias.scrollIntoView({ behavior: 'smooth', block: 'center' });
      })
      .catch(function () { mostrarError(errorInvitados, 'No pudimos conectar. Revisa tu internet e inténtalo de nuevo.'); })
      .then(function () { cargando(formInvitados, false); });
  });

  document.getElementById('btn-otro-codigo').addEventListener('click', function () {
    actual = null;
    inputCodigo.value = '';
    mostrarPaso('codigo');
    inputCodigo.focus();
  });

  document.getElementById('btn-editar').addEventListener('click', function () {
    mostrarPaso('invitados');
  });

  // Permite enlaces tipo ...#rsvp?codigo=FAMOLO321 o ?codigo=FAMOLO321
  var m = (location.search + location.hash).match(/codigo=([A-Za-z0-9]+)/);
  if (m) {
    inputCodigo.value = m[1].toUpperCase();
    formCodigo.requestSubmit ? formCodigo.requestSubmit() : formCodigo.dispatchEvent(new Event('submit'));
  }
})();
