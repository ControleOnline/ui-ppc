import { useEffect } from 'react'

export default function useBrowserVisibilityRefresh(refresh, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof refresh !== 'function') return undefined

    const documentTarget = globalThis?.document
    const windowTarget = globalThis?.window
    const refreshWhenVisible = () => {
      if (!documentTarget || documentTarget.visibilityState === 'visible') {
        refresh()
      }
    }

    documentTarget?.addEventListener?.('visibilitychange', refreshWhenVisible)
    windowTarget?.addEventListener?.('focus', refreshWhenVisible)

    return () => {
      documentTarget?.removeEventListener?.('visibilitychange', refreshWhenVisible)
      windowTarget?.removeEventListener?.('focus', refreshWhenVisible)
    }
  }, [enabled, refresh])
}
