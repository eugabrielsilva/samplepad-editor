import { capacitorFs } from 'platform/capacitor/fs'
import { capacitorMidi } from 'platform/capacitor/midi'
import { capacitorPath } from 'platform/capacitor/path'
import { createCapacitorDialog } from 'platform/capacitor/dialog'
import { createCapacitorStore } from 'platform/capacitor/store'
import { createCapacitorWav } from 'platform/capacitor/wav'
import { ExternalDirectory } from 'platform/capacitor/externalDirectory'
import { capacitorCallbacks, capacitorTriggers } from 'platform/capacitor/events'

export const createCapacitorApi = async () => {
  const store = await createCapacitorStore()
  const errors = []
  const access = store.get('externalDirectoryAccess')

  if (access?.bookmark) {
    try {
      const restored = await ExternalDirectory.restoreAccess({
        bookmark: access.bookmark
      })

      if (restored.stale) {
        await store.save('externalDirectoryAccess', {
          path: restored.filePath,
          bookmark: restored.bookmark
        })
      }
    } catch (error) {
      errors.push(error)
    }
  }

  return {
    api: {
      fs: capacitorFs,
      path: capacitorPath,
      store,
      dialog: createCapacitorDialog(store),
      wav: createCapacitorWav(),
      midi: capacitorMidi,
      mainProcessCallbacks: capacitorCallbacks,
      mainProcessTriggers: capacitorTriggers
    },
    errors
  }
}
