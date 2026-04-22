import { useCallback, useState } from 'react'
import { loadSettings, saveSettings } from '../lib/openai'
import type { OpenAISettings } from '../types'

export function useSettings() {
  const [settings, setSettings] = useState<OpenAISettings>(() => loadSettings())

  const update = useCallback((next: OpenAISettings) => {
    setSettings(next)
    saveSettings(next)
  }, [])

  return { settings, update, hasKey: settings.apiKey.length > 0 }
}
