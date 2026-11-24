import { Preferences } from '@capacitor/preferences'

export const createCapacitorStore = async () => {
  const cache = {}
  const { keys } = await Preferences.keys()

  await Promise.all(keys.map(async (key) => {
    const { value } = await Preferences.get({ key })

    if (value === null) {
      return
    }

    try {
      cache[key] = JSON.parse(value)
    } catch {
      cache[key] = value
    }
  }))

  return {
    get: (key) => cache[key],
    save: (key, value) => {
      cache[key] = value
      return Preferences.set({
        key,
        value: JSON.stringify(value)
      })
    }
  }
}
