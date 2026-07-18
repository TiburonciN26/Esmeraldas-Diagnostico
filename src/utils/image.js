// Comprime una imagen del input file a un data URL JPEG liviano, redimensionada
// para que ninguna foto de celular (5-15 MB) llegue entera al backend.
// 1024px/0.72 en vez de 1280px/0.8: para una ficha de referencia de
// colorimetría (no una foto de estudio) la diferencia visual es mínima,
// pero el payload del POST baja ~40-50% — importante porque ese data URL ya
// viaja un 33% más pesado que el archivo original (base64), y es el mismo
// request que sube la foto a Drive y escribe la fila, así que es el caso
// más lento de toda la app.
export function comprimirImagen(file, { maxDim = 1024, calidad = 0.72 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'))
      img.onload = () => {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', calidad))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
