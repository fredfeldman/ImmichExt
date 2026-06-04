import { useEffect } from 'react'

type KeyBinding = {
  key: string
  description?: string
  handler: (event: KeyboardEvent) => void
  ctrlOrMeta?: boolean
  shift?: boolean
  alt?: boolean
  allowInInput?: boolean
}

type UseKeyboardOptions = {
  enabled?: boolean
}

const isEditableTarget = (event: KeyboardEvent): boolean => {
  const target = event.target as HTMLElement | null
  const tag = target?.tagName

  return Boolean(
    target?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT',
  )
}

const normalizeKey = (value: string) => value.toLowerCase()

export const useKeyboard = (bindings: KeyBinding[], options: UseKeyboardOptions = {}) => {
  const { enabled = true } = options

  useEffect(() => {
    if (!enabled) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      for (const binding of bindings) {
        if (!binding.allowInInput && isEditableTarget(event)) {
          continue
        }

        const matchesKey = normalizeKey(event.key) === normalizeKey(binding.key)
        const matchesCtrlOrMeta = binding.ctrlOrMeta ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
        const matchesShift = binding.shift ? event.shiftKey : !event.shiftKey
        const matchesAlt = binding.alt ? event.altKey : !event.altKey

        if (!matchesKey || !matchesCtrlOrMeta || !matchesShift || !matchesAlt) {
          continue
        }

        event.preventDefault()
        binding.handler(event)
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [bindings, enabled])
}

export type { KeyBinding }
