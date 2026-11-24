/* Electron imports */
import { Buffer } from 'buffer'
import { getPlatformApi, isElectron } from 'platform/runtime'

const { fs } = getPlatformApi()

export const getBuffer = (filePath) => {
  if (isElectron) {
    return Buffer.from(fs.readFileBufferArray(filePath));
  }

  return fs.readFileBufferArray(filePath).then((data) => Buffer.from(data))
}