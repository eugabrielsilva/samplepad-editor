import { Buffer } from 'buffer'
import { Encoding, Filesystem } from '@capacitor/filesystem'
import { capacitorPath } from 'platform/capacitor/path'

const isMissingFileError = (error) => /not exist|not found|ENOENT|no such file/i.test(error?.message || '')

const asDirectoryEntry = (entry) => ({
  name: entry.name,
  isFile: () => entry.type === 'file',
  isDirectory: () => entry.type === 'directory'
})

const toBase64 = (content) => {
  const bytes = content instanceof Uint8Array ? content : Buffer.from(content)
  return Buffer.from(bytes).toString('base64')
}

const normaliseFilePath = (file) => (
  String(file).startsWith('file://') ? new URL(file).href : String(file)
)

export const capacitorFs = {
  exists: async (file) => {
    try {
      await Filesystem.stat({ path: normaliseFilePath(file) })
      return true
    } catch (error) {
      if (isMissingFileError(error)) {
        return false
      }

      throw error
    }
  },
  isDirectory: async (file) => {
    const stat = await Filesystem.stat({ path: normaliseFilePath(file) })
    return stat.type === 'directory'
  },
  mkdir: (file) => Filesystem.mkdir({ path: normaliseFilePath(file), recursive: true }),
  renameFile: (source, destination) => Filesystem.rename({
    from: normaliseFilePath(source),
    to: normaliseFilePath(destination)
  }),
  readFileAsString: async (file) => {
    const result = await Filesystem.readFile({
      path: normaliseFilePath(file),
      encoding: Encoding.UTF8
    })
    return result.data
  },
  readFileAsArrayByLine: async (file) => {
    const result = await Filesystem.readFile({
      path: normaliseFilePath(file),
      encoding: Encoding.UTF8
    })
    return result.data.split('\n')
  },
  readFileBufferArray: async (file) => {
    const result = await Filesystem.readFile({ path: normaliseFilePath(file) })
    return Uint8Array.from(Buffer.from(result.data, 'base64'))
  },
  writeFile: (file, content) => {
    if (typeof content === 'string') {
      return Filesystem.writeFile({
        path: normaliseFilePath(file),
        data: content,
        encoding: Encoding.UTF8
      })
    }

    return Filesystem.writeFile({
      path: normaliseFilePath(file),
      data: toBase64(content),
      recursive: true
    })
  },
  deleteFile: (file) => Filesystem.deleteFile({ path: normaliseFilePath(file) }),
  getFileListFromDirectory: async (dirPath) => {
    const result = await Filesystem.readdir({ path: normaliseFilePath(dirPath) })
    return result.files.map((entry) => entry.uri || `${dirPath}/${entry.name}`)
  },
  getSampleFiles: async (sampleDirectoryPath) => {
    const result = await Filesystem.readdir({ path: normaliseFilePath(sampleDirectoryPath) })
    return result.files
      .map(asDirectoryEntry)
      .filter((entry) => entry.isFile()
        && !entry.name.startsWith('.')
        && capacitorPath.parse(entry.name).ext.toUpperCase() === '.WAV')
  },
  getKitFiles: async (kitPath) => {
    const result = await Filesystem.readdir({ path: normaliseFilePath(kitPath) })
    return result.files
      .map(asDirectoryEntry)
      .filter((entry) => entry.isFile()
        && !entry.name.startsWith('.')
        && capacitorPath.parse(entry.name).ext.toUpperCase() === '.KIT')
  }
}
