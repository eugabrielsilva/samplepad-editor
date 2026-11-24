import { NativeAudio } from '@capgo/capacitor-native-audio'

const pendingPlayback = new Map()
let configured
let completionListener

const initializeAudio = () => {
  if (!configured) {
    configured = Promise.all([
      NativeAudio.configure({
        focus: true,
        background: false,
        ignoreSilent: true,
        showNotification: false
      }),
      NativeAudio.addListener('complete', async ({ assetId }) => {
        const playback = pendingPlayback.get(assetId)

        if (!playback) {
          return
        }

        pendingPlayback.delete(assetId)
        try {
          await NativeAudio.unload({ assetId })
        } catch (error) {
          console.error('Unable to unload completed audio playback.', error)
        } finally {
          playback.resolve()
        }
      }).then((handle) => {
        completionListener = handle
      })
    ])
  }

  return configured
}

export const createCapacitorWav = () => ({
  playWavFile: async (wavId, filePath) => {
    const completion = new Promise((resolve, reject) => {
      pendingPlayback.set(wavId, { resolve, reject })
    })

    try {
      await initializeAudio()
      await NativeAudio.preload({
        assetId: wavId,
        assetPath: filePath.startsWith('file://') ? new URL(filePath).href : filePath,
        audioChannelNum: 1,
        isUrl: true
      })

      if (!pendingPlayback.has(wavId)) {
        await NativeAudio.unload({ assetId: wavId })
        return completion
      }

      await NativeAudio.play({ assetId: wavId })
      return completion
    } catch (error) {
      pendingPlayback.delete(wavId)
      await NativeAudio.unload({ assetId: wavId }).catch((unloadError) => {
        console.error('Unable to unload failed audio playback.', unloadError)
      })
      throw error
    }
  },
  stopWavFile: async (wavId) => {
    if (!pendingPlayback.has(wavId)) {
      return
    }

    pendingPlayback.delete(wavId)

    try {
      await NativeAudio.stop({ assetId: wavId })
      await NativeAudio.unload({ assetId: wavId })
    } catch (error) {
      console.error('Unable to stop audio playback.', error)
    }
  }
})

export const releaseCapacitorAudio = async () => {
  const listeners = completionListener ? [completionListener.remove()] : []
  await Promise.all(listeners)
  completionListener = undefined
  configured = undefined
}
