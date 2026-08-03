// ============================================================================
// Esmeraldas · Diagnóstico de Colorimetría — Backend (Google Apps Script)
// ============================================================================
// Web App que expone doGet (lecturas) y doPost (altas/ediciones/bajas) sobre
// la hoja de cálculo, respondiendo JSON. Reemplaza a los servicios mock del
// frontend (src/services/*.js) sin cambiar la forma de los datos.
//
// Pestañas esperadas en la hoja (nombres exactos, en minúscula):
//   cliente, diagnostico, visita, usuario
//
// Autenticación: liviana a propósito (correo + contraseña asignada a mano en
// la pestaña "usuario", columna "codigo"). No hay recuperación automática:
// si alguien la pierde, se la reasigna editando la hoja directamente.
// Alcanza para un equipo chico de confianza; no es seguridad de nivel
// bancario. Todo (lecturas y escrituras) viaja por POST, nunca en la URL,
// para que las credenciales no queden en logs de servidores intermedios; y
// hay un límite de intentos fallidos por correo para dificultar la fuerza
// bruta (ver verificarUsuario_).
//
// Rol "administrador": ve todo, incluido el precio de las visitas.
// Rol "usuario": ve todo excepto el campo "precio" (se lo quitamos de la
// respuesta antes de enviarla, no solo lo ocultamos en el frontend).
// ============================================================================

// TODO: reemplazar por el ID real si alguna vez cambia la hoja.
var SPREADSHEET_ID = '1B9bI-cItCoOfyIchsXSuAwtVjmovpslXHCTFZP-WXKY'

var SHEETS = {
  CLIENTE: 'cliente',
  DIAGNOSTICO: 'diagnostico',
  VISITA: 'visita',
  USUARIO: 'usuario',
}

// ---------------------------------------------------------------------------
// Entradas HTTP
// ---------------------------------------------------------------------------

function doGet(e) {
  _resetCache_()
  try {
    var p = (e && e.parameter) || {}

    // Único uso de GET: probar que el deploy funciona pegando la URL
    // /exec?action=ping directo en el navegador. Todo lo demás (incluidas
    // TODAS las lecturas autenticadas) va por doPost, para que el correo y
    // la contraseña nunca viajen en una URL ni queden en logs.
    if (p.action === 'ping') return jsonOut_({ ok: true, data: 'pong' })

    throw new Error('Esta acción requiere POST.')
  } catch (err) {
    return jsonOut_({ ok: false, error: String((err && err.message) || err) })
  }
}

// Acciones que escriben la hoja: se ejecutan bajo LockService (ver doPost)
// para que dos guardados simultáneos no se pisen con un read-then-write
// intercalado (ej. updateRowById_ leyendo la fila vieja mientras otro
// request todavía no terminó de escribir la suya).
var ACCIONES_ESCRITURA = {
  guardarClienteCompleto: true,
  deleteCliente: true,
  createVisita: true,
  updateVisita: true,
  deleteVisita: true,
}

function doPost(e) {
  _resetCache_()
  try {
    // Importante: el frontend NO debe declarar Content-Type: application/json
    // en el fetch (eso dispara un preflight CORS que Apps Script no responde
    // bien). Con el body como string plano, Apps Script igual lo recibe acá
    // y lo parseamos nosotros.
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}')
    var usuario = verificarUsuario_(body.correo, body.codigo)
    var data = body.data || {}
    var result

    var lock = null
    if (ACCIONES_ESCRITURA[body.action]) {
      lock = LockService.getScriptLock()
      try {
        lock.waitLock(10000)
      } catch (lockErr) {
        throw new Error('Otro cambio se está guardando en este momento. Probá de nuevo en unos segundos.')
      }
    }

    try {
      switch (body.action) {
        // Solo valida credenciales y devuelve quién es (para el login del
        // frontend). No expone la contraseña de vuelta.
        case 'login':
          result = { correo: usuario.correo, rol: usuario.rol, nombre: usuario.nombre }
          break

        // Sin paginado: manda TODOS los clientes activos en un solo payload.
        // Mismo criterio que el techo de escala documentado arriba de ss_()
        // — irrelevante hasta varios cientos de clientes. Si algún día pesa,
        // la solución es paginar (p.ej. parámetros offset/limit acá) y
        // agregar scroll infinito en Home.jsx, no antes.
        case 'getClientes':
          result = readAll_(SHEETS.CLIENTE).filter(function (c) {
            return c.activo
          })
          break

        case 'getClienteById':
          result = soloActivo_(findById_(SHEETS.CLIENTE, body.id))
          break

        // Junta cliente + diagnóstico + visitas en una sola llamada — la
        // pantalla de Detalle de cliente antes hacía 3 requests en paralelo,
        // y cada una paga el arranque en frío de Apps Script por separado.
        case 'getClienteCompleto': {
          var clienteCompleto = soloActivo_(findById_(SHEETS.CLIENTE, body.id))
          result = {
            cliente: clienteCompleto,
            diagnostico: findByField_(SHEETS.DIAGNOSTICO, 'clienteId', body.id)[0] || null,
            visitas: visitasDeCliente_(body.id).map(function (v) {
              return filtrarPrecio_(v, usuario)
            }),
          }
          break
        }

        case 'getDiagnosticoByClienteId':
          result = findByField_(SHEETS.DIAGNOSTICO, 'clienteId', body.clienteId)[0] || null
          break

        // Guarda cliente + diagnóstico en un solo request. Antes eran hasta 3
        // round-trips secuenciales (crear/actualizar cliente, leer el
        // diagnóstico existente, crear/actualizar diagnóstico); acá se
        // resuelve todo de una sola pasada.
        case 'guardarClienteCompleto': {
          var clienteData = soloCampos_(body.cliente || {}, 'cliente')
          var diagnosticoData = soloCampos_(body.diagnostico || {}, 'diagnostico')
          var clienteId = body.id
          var clienteFinal, diagnosticoFinal

          // updateRowById_/appendRow_ ya devuelven la fila final escrita
          // (ver sus comentarios) — antes esto releía cliente y diagnóstico
          // desde la hoja después de escribirlos, acá se arma la respuesta
          // con lo que ya quedó en memoria.
          if (clienteId) {
            clienteFinal = updateRowById_(SHEETS.CLIENTE, clienteId, clienteData)
          } else {
            clienteId = newId_('c')
            clienteFinal = appendRow_(
              SHEETS.CLIENTE,
              mergeForce_(clienteData, { id: clienteId, activo: true })
            )
          }

          var diagExistente = findByField_(SHEETS.DIAGNOSTICO, 'clienteId', clienteId)[0]
          if (diagExistente) {
            diagnosticoFinal = updateRowById_(SHEETS.DIAGNOSTICO, diagExistente.id, diagnosticoData)
          } else {
            diagnosticoFinal = appendRow_(
              SHEETS.DIAGNOSTICO,
              mergeForce_(diagnosticoData, { id: newId_('d'), clienteId: clienteId })
            )
          }

          result = { cliente: clienteFinal, diagnostico: diagnosticoFinal }
          break
        }
        case 'deleteCliente':
          updateRowById_(SHEETS.CLIENTE, body.id, { activo: false })
          desactivarVisitasDeCliente_(body.id)
          result = true
          break

        // conFotoSubida_ sube la foto a Drive acá mismo si viene como data
        // URL, así crear/editar una visita con foto nueva es un solo
        // request en vez de subir la foto aparte y recién después guardar
        // la visita.
        case 'createVisita': {
          if (!soloActivo_(findById_(SHEETS.CLIENTE, body.clienteId))) {
            throw new Error('El cliente no existe o fue eliminado.')
          }
          // El frontend manda el id ya generado (ver visitasService.js) para
          // que un reintento tras un timeout de red sea idempotente: si la
          // escritura anterior en realidad sí se guardó (el timeout fue solo
          // en la respuesta), esta vuelta encuentra la fila ya escrita y la
          // devuelve tal cual, en vez de crear una visita duplicada.
          var idV = body.id ? String(body.id) : newId_('v')
          var yaExistente = body.id ? findById_(SHEETS.VISITA, idV) : null
          if (yaExistente) {
            result = filtrarPrecio_(yaExistente, usuario)
            break
          }
          var conFoto = conFotoSubida_(data)
          var datosVisita = soloCampos_(conFoto.data, 'visita')
          try {
            result = appendRow_(
              SHEETS.VISITA,
              mergeForce_(sanitizarEscrituraVisita_(datosVisita, usuario), {
                id: idV,
                clienteId: body.clienteId,
                activo: true,
              })
            )
          } catch (writeErr) {
            borrarFotoSiExiste_(conFoto.fotoSubidaId)
            throw writeErr
          }
          result = filtrarPrecio_(result, usuario)
          break
        }
        case 'updateVisita': {
          var conFotoUpdate = conFotoSubida_(data)
          var datosVisitaUpdate = soloCampos_(conFotoUpdate.data, 'visita')
          try {
            // updateRowById_ ya devuelve la fila parcheada — evita releer
            // la hoja de visitas entera solo para obtener lo que acabamos
            // de escribir.
            result = updateRowById_(
              SHEETS.VISITA,
              body.id,
              sanitizarEscrituraVisita_(datosVisitaUpdate, usuario)
            )
          } catch (writeErr) {
            borrarFotoSiExiste_(conFotoUpdate.fotoSubidaId)
            throw writeErr
          }
          result = filtrarPrecio_(result, usuario)
          break
        }
        case 'deleteVisita':
          updateRowById_(SHEETS.VISITA, body.id, { activo: false })
          result = true
          break

        default:
          throw new Error('Acción desconocida: ' + body.action)
      }
    } finally {
      if (lock) lock.releaseLock()
    }

    return jsonOut_({ ok: true, data: result })
  } catch (err) {
    return jsonOut_({ ok: false, error: String((err && err.message) || err) })
  }
}

// ---------------------------------------------------------------------------
// Autenticación (correo + contraseña, asignados a mano en la pestaña "usuario")
// ---------------------------------------------------------------------------

var MAX_INTENTOS_FALLIDOS = 8
var BLOQUEO_SEGUNDOS = 300 // 5 min

function verificarUsuario_(correo, codigo) {
  var correoNorm = String(correo || '')
    .trim()
    .toLowerCase()
  if (!correoNorm) throw new Error('Falta el correo.')

  // Freno de fuerza bruta: cuenta intentos fallidos por correo (no importa
  // si el correo existe o no, para no revelar esa diferencia) y bloquea
  // temporalmente después de demasiados. Se resetea al primer login exitoso.
  var cache = CacheService.getScriptCache()
  var intentosKey = 'intentos_' + correoNorm
  if (Number(cache.get(intentosKey) || 0) >= MAX_INTENTOS_FALLIDOS) {
    throw new Error('Demasiados intentos fallidos. Probá de nuevo en unos minutos.')
  }

  var usuarios = usuariosCacheados_()
  var u = usuarios.filter(function (r) {
    return String(r.correo).trim().toLowerCase() === correoNorm
  })[0]

  var valido = Boolean(u) && u.activo && String(u.codigo || '') === String(codigo || '')
  if (!valido) {
    cache.put(intentosKey, String(Number(cache.get(intentosKey) || 0) + 1), BLOQUEO_SEGUNDOS)
    throw new Error('Correo o contraseña incorrectos.')
  }

  cache.remove(intentosKey)
  return u // { correo, rol, nombre, codigo, activo }
}

// La pestaña "usuario" se lee en CADA request (toda acción empieza
// autenticando), así que es la que más se beneficia de un TTL largo — de
// ahí que tenga su propia entrada de caché (clave "usuarios") en vez de
// depender del TTL genérico de 60s de SHEET_CACHE_TTL_SEGUNDOS (ver
// readAll_). 5 minutos porque los roles/contraseñas casi no cambian una vez
// asignados (a diferencia de clientes/visitas, que se editan todo el
// tiempo desde la app). Si editás un rol/código a mano en la hoja, puede
// tardar hasta 5 min en verse reflejado.
function usuariosCacheados_() {
  var cache = CacheService.getScriptCache()
  var cached = cache.get('usuarios')
  if (cached) return JSON.parse(cached)
  var usuarios = readAll_(SHEETS.USUARIO)
  cache.put('usuarios', JSON.stringify(usuarios), 300)
  return usuarios
}

// Devuelve una copia de obj sin la clave "precio", salvo que el usuario sea
// administrador (ahí se devuelve tal cual). Compartida por filtrarPrecio_
// (lecturas) y sanitizarEscrituraVisita_ (escrituras) — antes cada una
// repetía el mismo loop por separado.
function sinPrecioSiNoAdmin_(obj, usuario) {
  if (usuario.rol === 'administrador') return obj
  var copia = {}
  for (var k in obj) {
    if (k !== 'precio') copia[k] = obj[k]
  }
  return copia
}

// Le saca el campo "precio" a una visita si quien pregunta no es admin.
function filtrarPrecio_(visita, usuario) {
  if (!visita) return visita
  return sinPrecioSiNoAdmin_(visita, usuario)
}

// Igual que filtrarPrecio_ pero para lo que llega en un create/update: si no
// es admin, el precio no se guarda aunque lo mande en el payload (si no, un
// "usuario" podría colar un precio a mano aunque nunca pueda leerlos).
function sanitizarEscrituraVisita_(data, usuario) {
  return sinPrecioSiNoAdmin_(data, usuario)
}

function visitasDeCliente_(clienteId) {
  return findByField_(SHEETS.VISITA, 'clienteId', clienteId)
    .filter(function (v) {
      return v.activo
    })
    .sort(function (a, b) {
      return String(b.fecha || '').localeCompare(String(a.fecha || ''))
    })
}

// Al desactivar un cliente, desactiva en cascada sus visitas — si no,
// quedan visitas "activo: true" sueltas sin un cliente activo que las
// referencie, lo que ensuciaría cualquier función futura que lea la hoja
// de visitas directamente (reportes, búsquedas globales) sin pasar por el
// cliente. (La hoja "diagnostico" no tiene columna "activo", así que no
// aplica acá.)
function desactivarVisitasDeCliente_(clienteId) {
  var visitas = findByField_(SHEETS.VISITA, 'clienteId', clienteId)
  for (var i = 0; i < visitas.length; i++) {
    if (visitas[i].activo) updateRowById_(SHEETS.VISITA, visitas[i].id, { activo: false })
  }
}

function soloActivo_(row) {
  return row && row.activo ? row : null
}

// ---------------------------------------------------------------------------
// Acceso genérico a las hojas
//
// Techo de escala: readAll_ siempre trae la hoja ENTERA de Sheets en un
// cache-miss y filtra en memoria (sin índices, sin paginado). Para un salón
// esto anda bien durante años — recién se nota al acercarse a los
// ~2.000-3.000 registros en "visita" (la hoja que más crece), que es
// también donde el límite de 100KB por entrada de CacheService (ver
// SHEET_CACHE_TTL_SEGUNDOS más abajo) empezaría a hacer que esa hoja ya no
// entre en caché — guardarEnCacheDeHoja_ lo tolera (no cachea esa vuelta en
// vez de romper la lectura), así que ese día simplemente se pierde el
// beneficio de la caché para "visita", no la app entera.
// ---------------------------------------------------------------------------

// Dos niveles de caché para no pagar una lectura de hoja completa en cada
// request:
//   1. _readAllCache — en memoria, dura un solo request (la resetea
//      _resetCache_ al entrar a doGet/doPost). Evita que una sola acción
//      que toca la misma hoja más de una vez (p.ej. getClienteCompleto o
//      guardarClienteCompleto) la relea dentro de esa misma ejecución.
//   2. CacheService.getScriptCache() — persiste ENTRE requests distintos
//      hasta SHEET_CACHE_TTL_SEGUNDOS, o hasta que una escritura la
//      invalide (ver invalidarCache_). Este es el que realmente evita
//      pagar la lectura de Sheets en cada request nuevo, no solo dentro
//      del mismo. Como toda escritura pasa por invalidarCache_ (que borra
//      la entrada al instante), un usuario nunca ve desactualizado su
//      propio cambio; el TTL es solo un techo defensivo por si alguna vez
//      se edita la hoja a mano por fuera de la app (ver README).
var _ssCache = null
var _readAllCache = {}
var SHEET_CACHE_TTL_SEGUNDOS = 60

function _resetCache_() {
  _ssCache = null
  _readAllCache = {}
}

// Invalida los dos niveles de caché de una hoja después de escribirla.
function invalidarCache_(sheetName) {
  delete _readAllCache[sheetName]
  CacheService.getScriptCache().remove('sheet_' + sheetName)
}

function ss_() {
  if (!_ssCache) _ssCache = SpreadsheetApp.openById(SPREADSHEET_ID)
  return _ssCache
}

function sheet_(name) {
  var sh = ss_().getSheetByName(name)
  if (!sh) throw new Error('No existe la pestaña "' + name + '" en la hoja.')
  return sh
}

// Guarda "rows" en CacheService bajo la clave de "sheetName". Es
// best-effort a propósito: si el JSON supera el límite de 100KB por entrada
// de CacheService (u ocurre cualquier otro error de caché), no vale la pena
// romper la lectura por esto — esa vuelta simplemente no queda cacheada
// entre requests, pero la respuesta ya se armó igual.
function guardarEnCacheDeHoja_(sheetName, rows) {
  try {
    CacheService.getScriptCache().put('sheet_' + sheetName, JSON.stringify(rows), SHEET_CACHE_TTL_SEGUNDOS)
  } catch (e) {
    // Nada más que hacer.
  }
}

// Convierte cada fila (a partir de la 2) en un objeto {header: valor},
// normalizando fechas (Date -> "YYYY-MM-DD") y "activo" (-> booleano real).
// Los objetos devueltos nunca se mutan en el lugar (filtrarPrecio_ y afines
// siempre copian), así que es seguro compartir las mismas referencias entre
// varios callers del mismo request, y también reconstruirlos tal cual desde
// JSON entre requests distintos (ver los dos niveles de caché arriba).
function readAll_(sheetName) {
  if (_readAllCache[sheetName]) return _readAllCache[sheetName]

  try {
    var cached = CacheService.getScriptCache().get('sheet_' + sheetName)
    if (cached) {
      var rowsCacheadas = JSON.parse(cached)
      _readAllCache[sheetName] = rowsCacheadas
      return rowsCacheadas
    }
  } catch (e) {
    // Entrada de caché corrupta o inaccesible: seguir como si no hubiera.
  }

  var sh = sheet_(sheetName)
  var values = sh.getDataRange().getValues()
  var rows = []
  if (values.length >= 1) {
    var headers = values[0].map(String)
    for (var i = 1; i < values.length; i++) {
      var row = values[i]
      var vacia = row.every(function (c) {
        return c === ''
      })
      if (vacia) continue
      var obj = {}
      for (var col = 0; col < headers.length; col++) {
        obj[headers[col]] = normalizeValue_(headers[col], row[col])
      }
      rows.push(obj)
    }
  }
  _readAllCache[sheetName] = rows
  guardarEnCacheDeHoja_(sheetName, rows)
  return rows
}

function normalizeValue_(header, v) {
  if (header === 'activo') {
    return v === true || v === 'TRUE' || v === 'true' || v === 1
  }
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd')
  }
  if (v === '' || v === null || typeof v === 'undefined') return ''
  return String(v)
}

function findByField_(sheetName, field, value) {
  return readAll_(sheetName).filter(function (r) {
    return String(r[field]) === String(value)
  })
}

function findById_(sheetName, id) {
  return findByField_(sheetName, 'id', id)[0] || null
}

// Escribe la fila nueva y devuelve el objeto ya escrito, con el mismo
// formato que readAll_ (mismos headers, mismas normalizaciones) — antes
// terminaba con un findById_ (relee la hoja entera) solo para devolver algo
// que ya se tenía armado en memoria.
function appendRow_(sheetName, obj) {
  var sh = sheet_(sheetName)
  var headers = sh
    .getRange(1, 1, 1, sh.getLastColumn())
    .getValues()[0]
    .map(String)
  var row = headers.map(function (h) {
    return Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : ''
  })
  sh.appendRow(row)
  invalidarCache_(sheetName)
  var out = {}
  for (var i = 0; i < headers.length; i++) {
    out[headers[i]] = normalizeValue_(headers[i], row[i])
  }
  return out
}

// Escribe la fila entera con un solo setValues() (en vez de un setValue() por
// columna modificada) — actualizar una visita llegaba a hacer hasta 17
// llamadas individuales a la API de Sheets. Devuelve la fila ya parcheada
// (mismo formato que readAll_) para que el caller no tenga que volver a leer
// la hoja para saber cómo quedó.
function updateRowById_(sheetName, id, patch) {
  var sh = sheet_(sheetName)
  var values = sh.getDataRange().getValues()
  var headers = values[0].map(String)
  var idCol = headers.indexOf('id')
  if (idCol === -1) throw new Error('La pestaña "' + sheetName + '" no tiene columna "id".')

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      var row = values[i].slice()
      for (var col = 0; col < headers.length; col++) {
        var h = headers[col]
        if (Object.prototype.hasOwnProperty.call(patch, h)) {
          row[col] = patch[h]
        }
      }
      sh.getRange(i + 1, 1, 1, headers.length).setValues([row])
      invalidarCache_(sheetName)
      var out = {}
      for (var c2 = 0; c2 < headers.length; c2++) {
        out[headers[c2]] = normalizeValue_(headers[c2], row[c2])
      }
      return out
    }
  }
  throw new Error('No se encontró la fila con id "' + id + '" en "' + sheetName + '".')
}

// Combina data (del cliente) con overrides (controlados por el servidor,
// como id/activo) — los overrides siempre ganan.
function mergeForce_(data, overrides) {
  var out = {}
  for (var k in data) out[k] = data[k]
  for (var k2 in overrides) out[k2] = overrides[k2]
  return out
}

// Campos que el cliente puede escribir en cada tabla. Todo lo demás (id,
// clienteId, activo) lo controla el servidor — si el payload trae esas
// claves (a propósito o por error), soloCampos_ las descarta antes de que
// lleguen a mergeForce_/updateRowById_, así nunca pueden pisarse "por
// accidente" con un patch que use los mismos nombres que esos headers.
var CAMPOS_ESCRIBIBLES = {
  cliente: ['nombreCompleto', 'telefono', 'fechaCumpleanos'],
  diagnostico: ['canasResistentes', 'alisadoOKeratinaPrevia', 'fechaAlisadoOKeratina', 'grosorCabello'],
  visita: [
    'tipoAplicacion',
    'decoloracionEtapa',
    'formulaRaiz',
    'oxidanteRaiz',
    'tiempoRaiz',
    'amonioRaiz',
    'formulaMediosAPuntas',
    'oxidanteMediosAPuntas',
    'tiempoMediosAPuntas',
    'amonioMediosAPuntas',
    'fecha',
    'precio',
    'nota',
    'colorObtenido',
    'porcentajeCanas',
    'largoCabello',
    'fotoResultado',
  ],
}

function soloCampos_(data, tabla) {
  var permitidos = CAMPOS_ESCRIBIBLES[tabla] || []
  var copia = {}
  for (var i = 0; i < permitidos.length; i++) {
    var campo = permitidos[i]
    if (Object.prototype.hasOwnProperty.call(data, campo)) copia[campo] = data[campo]
  }
  return copia
}

function newId_(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 10)
}

// ---------------------------------------------------------------------------
// Fotos de resultado → Google Drive (evita guardar base64 en la celda,
// que tiene un límite de ~50.000 caracteres en Sheets)
// ---------------------------------------------------------------------------

// Si "fotoResultado" viene como data URL (foto recién elegida, todavía sin
// subir), la sube acá mismo y reemplaza el campo por la URL definitiva.
// Devuelve también el id del archivo recién creado en Drive (null si no se
// subió nada nuevo) para que createVisita/updateVisita puedan borrarlo si el
// guardado de la visita falla después de la subida — si no, quedaría
// húerfano en Drive, sin nadie que lo referencie.
function conFotoSubida_(data) {
  var foto = data.fotoResultado
  if (foto && String(foto).indexOf('data:') === 0) {
    var file = subirFotoArchivo_(foto, 'visita_' + Date.now() + '.jpg')
    return { data: mergeForce_(data, { fotoResultado: urlDeFoto_(file) }), fotoSubidaId: file.getId() }
  }
  return { data: data, fotoSubidaId: null }
}

function subirFotoArchivo_(base64DataUrl, nombreSugerido) {
  var match = String(base64DataUrl || '').match(/^data:(.+);base64,(.*)$/)
  if (!match) throw new Error('Formato de imagen inválido (se esperaba un data URL base64).')

  var mimeType = match[1]
  var bytes = Utilities.base64Decode(match[2])
  var blob = Utilities.newBlob(bytes, mimeType, nombreSugerido || 'foto_' + Date.now())

  var file = carpetaFotos_().createFile(blob)
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
  return file
}

// "thumbnail" es el endpoint que Drive sostiene para incrustar en <img>;
// "uc?export=view" es más viejo y Google lo devuelve con 403 intermitentes
// cuando se lo llama desde un sitio externo.
function urlDeFoto_(file) {
  return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1280'
}

// Best-effort: si por lo que sea no se puede borrar (ya no existe, permisos),
// no vale la pena romper el flujo de error original por esto.
function borrarFotoSiExiste_(fileId) {
  if (!fileId) return
  try {
    DriveApp.getFileById(fileId).setTrashed(true)
  } catch (e) {
    // Nada más que hacer.
  }
}

function carpetaFotos_() {
  var nombre = 'Esmeraldas - Fotos de resultados'
  var iter = DriveApp.getFoldersByName(nombre)
  if (iter.hasNext()) return iter.next()
  return DriveApp.createFolder(nombre)
}

// ---------------------------------------------------------------------------
// Salida JSON
// ---------------------------------------------------------------------------

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  )
}
