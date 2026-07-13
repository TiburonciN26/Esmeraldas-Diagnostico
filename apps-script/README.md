# Backend (Google Apps Script)

`Code.gs` es el backend completo: lee y escribe la hoja de cálculo, responde JSON, y aplica el filtro de precio según el rol del usuario.

Hoja de datos: https://docs.google.com/spreadsheets/d/1B9bI-cItCoOfyIchsXSuAwtVjmovpslXHCTFZP-WXKY

## Paso 0 — agregar la columna que falta 

En la pestaña **usuario**, agregá una columna llamada exactamente `codigo` (después de `activo`, o donde quieras, el orden no importa). Ahí va la contraseña de cada persona — usá algo razonablemente largo (mínimo 8-10 caracteres, mezclando letras y números), no un PIN corto: hay un límite de intentos fallidos por correo, pero un código de 4 dígitos sigue siendo fácil de adivinar a mano.

## Paso 1 — subir el código

Hay dos formas. La primera vez conviene la manual (para crear el proyecto); de ahí en adelante, usá `clasp` — copy-pastear a mano es exactamente cómo este repo terminó varias veces con el código local más nuevo que el que estaba realmente publicado.

### Manual (la primera vez)

1. Abrí la hoja → menú **Extensiones → Apps Script**.
2. Borrá el contenido de `Código.gs` (el archivo vacío que trae por defecto) y pegá ahí todo el contenido de `Code.gs` de esta carpeta.
3. Guardá (ícono de disquete o Ctrl+S).

### Con clasp (recomendado de acá en adelante)

`clasp` es la CLI oficial de Google para Apps Script — permite subir `Code.gs` desde la terminal en vez de copiar y pegar en el editor web, así el repo nunca queda desincronizado de lo publicado.

**Configuración, una sola vez:**

1. `npm run gas:login` — abre el navegador para autenticarte con la cuenta de Google dueña del script (guarda las credenciales en tu máquina, fuera del repo).
2. En pps el editor de AScript (Extensiones → Apps Script) → ícono de engranaje **"Configuración del proyecto"** → copiá el **"ID del script"**.
3. En esa misma pantalla, anotá la **zona horaria** del proyecto (la vas a necesitar en el paso 5).
4. Copiá `apps-script/.clasp.json.example` a `apps-script/.clasp.json` y pegá tu ID del script ahí (`rootDir` dejalo en `"."`). Este archivo no se commitea (ver `.gitignore`) porque el ID es específico de tu instalación.
5. Abrí `apps-script/appsscript.json` y reemplazá `"REEMPLAZAR_ANTES_DE_PUSHEAR"` por la zona horaria real que anotaste en el paso 3 (ej. `"America/Guayaquil"`). **Importante:** si la dejás con el valor de relleno o ponés una zona distinta a la real, `Session.getScriptTimeZone()` — que usa `normalizeValue_` para formatear fechas — va a devolver fechas corridas. No lo adivines: usá el valor real del proyecto.

**Del día a día, en vez de copiar y pegar:**

```
npm run gas:push
```

Sube `Code.gs` + `appsscript.json` tal cual están en el repo. Después seguís con el Paso 4 más abajo ("Actualizar una implementación ya publicada") para publicar esa versión.

## Paso 2 — publicar como Web App

1. Arriba a la derecha, **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Configuración:
   - **Ejecutar como:** Yo (tu cuenta) — así el script siempre puede leer/escribir la hoja, sin importar quién use la app.
   - **Quién tiene acceso:** Cualquier usuario — necesario para que el frontend (hosteado en GitHub Pages) pueda llamarlo. La protección real la da el correo+contraseña, no esto.
4. **Implementar**. La primera vez Google va a pedirte autorizar permisos (acceso a tu Sheets y Drive) — es normal, es tu propio script accediendo a tus propios archivos.
5. Copiá la **URL de la aplicación web** (termina en `/exec`). Esa es la URL que necesito para conectar el frontend.

## Paso 3 — probar que funciona

Pegá esta URL en el navegador (reemplazando por la tuya):

```
https://script.google.com/macros/s/AKfycb.../exec?action=ping
```

Debería devolver `{"ok":true,"data":"pong"}`. Si en cambio aparece una pantalla de Google pidiendo iniciar sesión, revisá que "Quién tiene acceso" haya quedado en "Cualquier usuario".

## Cómo probar una acción real

Todas las acciones autenticadas (todo excepto `ping`) van por POST con el body en JSON — no se pueden probar pegando una URL en el navegador. Con `curl`:

```
curl -L -X POST '.../exec' \
  -d '{"action":"getClientes","correo":"jdeostuas2@gmail.com","codigo":"TU_CONTRASEÑA"}'
```

Deberías ver los clientes activos.

## Actualizar una implementación ya publicada

Si ya tenías el Web App publicado y el código de `Code.gs` cambió:

1. Subí el código: `npm run gas:push` (o, a mano, pegá el `Code.gs` actualizado sobre el anterior en el editor y guardá).
2. En el editor de Apps Script: **Implementar → Administrar implementaciones**.
3. Al lado de tu implementación activa, ícono de lápiz (✏️) → **Nueva versión** → **Implementar**.

Esto actualiza el código **sin** cambiar la URL `/exec` — el frontend sigue apuntando al mismo lugar. El paso 2-3 (publicar la nueva versión) todavía es manual — `clasp` puede automatizarlo también con `clasp deploy -i <deploymentId>` (el ID sale de `npm run gas:deployments`), pero como es un paso de "publicar en producción" y no de "sincronizar código", lo dejamos como clic consciente en vez de automatizarlo del todo.

## Notas

- **Si volvés a "Implementar → Nueva implementación"** después de editar el código, la URL cambia. Para actualizar el código sin cambiar la URL, usá **Implementar → Administrar implementaciones → ✏️ → Nueva versión**.
- El campo `precio` de las visitas se elimina de la respuesta para usuarios con rol `usuario` — no llega ni queda visible inspeccionando la red, no es solo un ocultamiento visual.
- Las fotos se suben a una carpeta de tu Drive llamada "Esmeraldas - Fotos de resultados" (como parte del mismo request de crear/editar la visita) y se devuelve la URL de visualización — eso es lo que se guarda en la celda `fotoResultado`, no la imagen en sí. El archivo queda compartido "cualquiera con el link"; el link en sí solo se obtiene autenticado, pero si te preocupa que alguien lo reenvíe fuera de la app, es un ítem pendiente (habría que armar un proxy autenticado en el propio Apps Script para servir las fotos, con el costo de latencia/cuota que eso trae — avisame si lo querés).
- Todas las acciones autenticadas van por POST, nunca por query string, para que el correo y la contraseña no queden en logs de servidores intermedios. Hay un límite de 8 intentos fallidos por correo, con bloqueo de 5 minutos, para dificultar la fuerza bruta sobre la contraseña.
- No hay recuperación automática de contraseña: si alguien la pierde, se la reasignás editando directamente la fila en la pestaña "usuario".
- La contraseña (columna `codigo`) viaja y se guarda en texto plano: en la hoja, en el caché de 30s del backend, y en el `localStorage` del navegador de cada persona logueada. No hay hash. Es aceptable para el modelo de confianza de un equipo chico con fichas de colorimetría — si esto alguna vez maneja datos más sensibles, hay que repensar el esquema de auth completo, no parchear esta pieza.
- La lista de clientes (`getClientes`) no está paginada — manda todos los clientes activos en un solo request. Igual que el resto de las lecturas, aguanta bien hasta varios cientos de clientes.
- `apps-script/.clasp.json` (con tu Script ID real) no está en el repo — cada quien lo arma una vez a partir de `.clasp.json.example`. Las credenciales de `clasp login` tampoco quedan en el repo, se guardan aparte en tu máquina.
- Si `clasp push` falla quejándose de la zona horaria, es porque `appsscript.json` todavía tiene el valor de relleno o uno distinto al real del proyecto — corregilo antes de reintentar (ver Paso 1).
