import { ExternalDirectory } from 'platform/capacitor/externalDirectory'

const getOpenTypes = (options) => {
  if (options.filters?.some((filter) => filter.extensions?.some(
    (extension) => extension.toLowerCase() === 'wav'
  ))) {
    return ['wav']
  }

  if (options.filters?.some((filter) => filter.extensions?.some(
    (extension) => extension.toLowerCase() === 'kit'
  ))) {
    return ['kit']
  }

  return []
}

export const createCapacitorDialog = (store) => ({
  showOpenDialog: async (options) => {
    if (options.properties?.includes('openDirectory')) {
      const result = await ExternalDirectory.pickDirectory()

      if (!result.canceled && result.bookmark && result.filePaths?.[0]) {
        await store.save('externalDirectoryAccess', {
          path: result.filePaths[0],
          bookmark: result.bookmark
        })
      }

      return result
    }

    return ExternalDirectory.pickFiles({
      extensions: getOpenTypes(options),
      multiple: Boolean(options.properties?.includes('multiSelections'))
    })
  }
})
