import { onMounted, onUnmounted } from 'vue'

interface ShortcutHandlers {
  onStartStop?: () => void
  onPauseResume?: () => void
  onToggleCamera?: () => void
  onToggleDrawing?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  function onKeyDown(e: KeyboardEvent) {
    // 不在输入框中时才响应
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    if (e.ctrlKey && e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case 'r':
          e.preventDefault()
          handlers.onStartStop?.()
          break
        case 'p':
          e.preventDefault()
          handlers.onPauseResume?.()
          break
        case 'c':
          e.preventDefault()
          handlers.onToggleCamera?.()
          break
        case 'd':
          e.preventDefault()
          handlers.onToggleDrawing?.()
          break
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
  })
}
