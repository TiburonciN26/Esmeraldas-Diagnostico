import { createContext, useCallback, useContext, useRef, useState } from 'react'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'

// Reemplaza window.confirm/alert (que se ven completamente fuera de estilo
// frente al resto de la UI) por un modal propio. confirm()/alert() se usan
// como sus equivalentes nativos pero devuelven una Promise, así los call
// sites solo cambian el "window." por un await.
const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const resolverRef = useRef(null)

  const abrir = useCallback((message, opts) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setDialog({ message, ...opts })
    })
  }, [])

  const confirm = useCallback(
    (message, opts = {}) => abrir(message, { tipo: 'confirm', ...opts }),
    [abrir]
  )
  const alert = useCallback((message, opts = {}) => abrir(message, { tipo: 'alert', ...opts }), [
    abrir,
  ])

  const cerrar = (resultado) => {
    setDialog(null)
    resolverRef.current?.(resultado)
    resolverRef.current = null
  }

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <Modal
          title={dialog.title || (dialog.tipo === 'alert' ? 'Aviso' : 'Confirmar')}
          onClose={() => cerrar(dialog.tipo === 'alert' ? undefined : false)}
          footer={
            dialog.tipo === 'alert' ? (
              <Button variant="primary" onClick={() => cerrar(undefined)}>
                Entendido
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => cerrar(false)}>
                  Cancelar
                </Button>
                <Button variant={dialog.danger ? 'danger' : 'primary'} onClick={() => cerrar(true)}>
                  {dialog.confirmLabel || 'Confirmar'}
                </Button>
              </>
            )
          }
        >
          <p>{dialog.message}</p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

function useConfirmContext() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm/useAlert deben usarse dentro de <ConfirmProvider>')
  return ctx
}

export function useConfirm() {
  return useConfirmContext().confirm
}

export function useAlert() {
  return useConfirmContext().alert
}
