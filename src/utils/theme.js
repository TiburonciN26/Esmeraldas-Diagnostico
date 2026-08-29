// Modo oscuro/claro — se aplica poniendo data-theme="dark"|"light" en
// <html> (index.css define ambas paletas bajo :root y :root[data-theme=
// "dark"]). Se guarda en localStorage (mismo criterio de confianza que
// session.js) para que la elección persista entre visitas.

const TEMA_KEY = 'esmeraldas_tema'

// Se llama UNA vez, en main.jsx, ANTES de montar React — así <html> ya
// tiene el atributo correcto en el primer paint, sin un flash del tema
// equivocado (un efecto de React corre recién después de pintar).
export function aplicarTemaInicial() {
  const tema = leerTemaGuardado() ?? (prefiereOscuroDelSistema() ? 'dark' : 'light')
  aplicarTema(tema)
}

export function leerTemaGuardado() {
  try {
    return localStorage.getItem(TEMA_KEY)
  } catch {
    return null
  }
}

function prefiereOscuroDelSistema() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

export function aplicarTema(tema) {
  document.documentElement.setAttribute('data-theme', tema)
  try {
    localStorage.setItem(TEMA_KEY, tema)
  } catch {
    // localStorage lleno o no disponible: el tema sigue aplicado para esta
    // sesión, solo no persiste para la próxima — no es crítico.
  }
}

export function temaActual() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}
