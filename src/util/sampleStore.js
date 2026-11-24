/* App imports */
import { Actions, Drive } from 'const'
import { showNotice } from 'actions/notice'
import { confirmDeleteSample } from 'actions/modal'
import { Sample } from 'state/models'
import { openSampleFileDialog } from 'util/fileDialog'
import { copySample } from 'util/storage'

/* Electron imports */
const { store, fs, path } = window.api

/**
 * responsible for managing sample file and display names
 *
 *  if a display name would be overwritten, its ok to overwrite its equivalent filename
 *    : kick.wav (stored as kick1.wav), when uploading another kick.wav should overwrite
 *
 *  but dont overwrite files that have been truncated
 *    : TR-909-KICK.wav (stored as TR-909-1.wav), when uploading a file called TR-909-1.wav
 *      it'd have to get renamed to not overwrite on disk
 */
class SampleStore {

  constructor(settings) {
    /** @var deviceId => path */
    this.devicePaths = store.get('devicePaths') || {}

    /** @var deviceId => {fileName => fileNameOnDisk} */
    this.samples = store.get('samples') || {}

    /** @var all the samples on the current device {fileName => fileNameOnDisk} */
    this.deviceSamples = {}
  }

  getSamples() {
    return this.deviceSamples
  }

  getFileNameOnDisk(fileName) {
    if (!fileName) {
      return ""
    }

    let entries = Object.entries(this.deviceSamples)
    let normalizedName = fileName.toLowerCase()
    let sample = entries.find(([displayName]) => displayName === fileName)
      || entries.find(([displayName]) => displayName.toLowerCase() === normalizedName)
      || entries.find(([, fileNameOnDisk]) => fileNameOnDisk.toLowerCase() === normalizedName)

    return this.devicePath + "/" + (sample ? sample[1] : fileName)
  }

  /**
   * Get the string to write to a kit file for the given file
   * @param {String} fileName
   * @return {String}
   */
  getWriteFileName(fileName) {
    if (!fileName) {
      return ""
    }

    let fileNameOnDisk = this.deviceSamples[fileName]
    if (!fileNameOnDisk) {
      return ""
    }

    return fileNameOnDisk
      .replace(/\.wav$/i, "")
      .slice(0, Drive.MAX_FILENAME_LENGTH)
  }

  getFileNameFromKitFile(fileName) {
    if (!fileName) {
      return ""
    }

    let reverseList = this._getFlippedDeviceSamples()

    if (reverseList[fileName]) {
      return reverseList[fileName]
    }

    let matchingFileName = Object.keys(reverseList).find((name) => {
      return name.toLowerCase() === fileName.toLowerCase()
    })

    if (matchingFileName) {
      return reverseList[matchingFileName]
    }

    return fileName
  }

  /**
   * Open a file dialog, and move the selected files into the drive
   */
  importSamples() {
    return (dispatch, getState) => {
      openSampleFileDialog()
        .then(result => {
          if (result.canceled) {
            return null
          }

          dispatch(showNotice("is-warning", "Import processing..."))

          let state = getState()
          let fileCount = state.drive.samples.length

          // run the import on a timeout to let the notice above show
          setTimeout(() => {
            let hadCopyError = false

            let parseDirectory = (fileList) => {
              fileList.forEach((file) => {
                if (fileCount >= Drive.MAX_SAMPLES) {
                  return
                }

                if (fs.isDirectory(file)) {
                  // read directories recursively
                  parseDirectory(fs.getFileListFromDirectory(file))
                } else {
                  let samplePath = path.parse(file)

                  if (samplePath.ext === Drive.SAMPLE_EXTENSION) {
                    let sample = this.addSample(samplePath.name, false)

                    try {
                      copySample(file, this.devicePath, sample.fileNameOnDisk)

                      // add the sample to the filename lists, so any subsequent copies will know its there
                      this._addFileReference(sample.fileName)
                      fileCount++
                    } catch (err) {
                      hadCopyError = true
                    }
                  }
                }
              })
            }

            parseDirectory(result.filePaths)
            this._saveSamples()

            dispatch({ type: Actions.RESET_SAMPLES, samples: Object.keys(this.deviceSamples) })

            if (hadCopyError) {
              dispatch(
                showNotice("is-warning", "There was a problem importing one or more samples.")
              )
            } else {
              dispatch(
                showNotice("is-success", "Samples successfully imported.")
              )
            }
          },100)
        })
    }
  }

  /**
   * Delete a sample from the current device.
   * @param {String} fileName
   * @param {Boolean} confirmedDelete
   */
  deleteSample(fileName, confirmedDelete=false) {
    return (dispatch, getState) => {
      if (!confirmedDelete) {
        dispatch(confirmDeleteSample(fileName, (result) => {
          return (dispatch, getState) => {
            if (result) {
              dispatch(this.deleteSample(fileName, true))
            }
          }
        }))
        return
      }

      const normalizedFileName = fileName.toLowerCase()
      const sampleName = Object.keys(this.deviceSamples).find(
        name => name.toLowerCase() === normalizedFileName
      )

      if (!sampleName) {
        dispatch(showNotice("is-danger", "Unable to find the sample to delete."))
        return
      }

      const fileNameOnDisk = this.deviceSamples[sampleName]
      const samplePath = this.devicePath + "/" + fileNameOnDisk

      try {
        if (fs.exists(samplePath)) {
          fs.deleteFile(samplePath)
        }

        this._removeFileReference(sampleName)
        delete this.deviceSamples[sampleName]
        this._saveSamples()
      } catch (error) {
        console.error("Unable to delete sample.", error)
        dispatch(showNotice("is-danger", "There was a problem deleting the sample from the SD card."))
        return
      }

      this._clearPadReferences(dispatch, getState().pads, sampleName, fileNameOnDisk)
      dispatch({ type: Actions.RESET_SAMPLES, samples: Object.keys(this.deviceSamples) })
      dispatch(showNotice("is-success", `Sample "${sampleName}" deleted from the SD card.`))
    }
  }

  _clearPadReferences(dispatch, pads, displayName, fileNameOnDisk) {
    const sampleNames = new Set([
      displayName.toLowerCase(),
      fileNameOnDisk.toLowerCase()
    ])

    Object.values(pads).forEach((pad) => {
      ['fileName', 'fileNameB'].forEach((property) => {
        if (pad[property] && sampleNames.has(pad[property].toLowerCase())) {
          dispatch({
            type: Actions.UPDATE_PAD_PROPERTY,
            padId: pad.id,
            property: property,
            value: null
          })
        }
      })
    })
  }

  /**
   * Load the sample list from disk and preserve display names from the cache.
   * @param {String} devicePath
   */
  loadSamplesFromDirectory(deviceId, devicePath) {
    const cachedSamples = this.samples[deviceId] || {}
    const filesOnDisk = Object.fromEntries(
      fs.getSampleFiles(devicePath)
        .map((dirent) => [dirent.name.toLowerCase(), dirent.name])
    )
    const reconciledSamples = {}

    Object.entries(cachedSamples).forEach(([displayName, fileNameOnDisk]) => {
      const currentFileName = filesOnDisk[fileNameOnDisk.toLowerCase()]
      if (currentFileName) {
        reconciledSamples[displayName] = currentFileName
      }
    })

    const mappedFiles = new Set(
      Object.values(reconciledSamples).map(fileName => fileName.toLowerCase())
    )

    Object.values(filesOnDisk).forEach((fileName) => {
      if (mappedFiles.has(fileName.toLowerCase())) {
        return
      }

      let displayName = fileName
      let count = 1
      const usedDisplayNames = new Set(
        Object.keys(reconciledSamples).map(name => name.toLowerCase())
      )

      while (usedDisplayNames.has(displayName.toLowerCase())) {
        const extensionIndex = fileName.lastIndexOf('.')
        const name = extensionIndex > -1
          ? fileName.slice(0, extensionIndex)
          : fileName
        const extension = extensionIndex > -1
          ? fileName.slice(extensionIndex)
          : ''
        displayName = name + count + extension
        count++
      }

      reconciledSamples[displayName] = fileName
      mappedFiles.add(fileName.toLowerCase())
    })

    this.deviceId = deviceId
    this.devicePath = devicePath
    this.deviceSamples = reconciledSamples

    this
      ._saveSamples()
      ._saveDevicePath(devicePath)
  }

  /**
   * Add a new file to the current device
   * @param {String} fileName
   */
  addSample(fileName, save=true) {
    // if the sample already exists, do we want to overwrite it?
    if (this._fileExists(fileName)) {
      // overwriting a sample - remove references to it so it can be overwritten
      this._removeFileReference(fileName)
    }

    this.deviceSamples[fileName] = this._getFormattedFileName(fileName)

    if (save) {
      this._saveSamples()
    }

    return Sample(fileName, this.deviceSamples[fileName])
  }

  _getFlippedDeviceSamples() {
    let ret = {}
    Object.keys(this.deviceSamples).forEach(key => {
      ret[this.deviceSamples[key]] = key
    })
    return ret
  }

  _saveSamples() {
    this.samples[this.deviceId] = this.deviceSamples
    store.save('samples', this.samples)
    this._loadFilenames()

    return this
  }

  _saveDevicePath(devicePath) {
    this.devicePaths[this.deviceId] = devicePath
    store.save('devicePaths', this.devicePaths)

    return this
  }

  _reset() {
    store.save('devicePaths', {})
    store.save('samples', {})
  }

  _loadDevice(deviceId) {
    this.deviceId = deviceId

    // todo: sort the samples by display name here
    this.devicePath = this.devicePaths[deviceId]
    this.deviceSamples = this.samples[deviceId]
    this._loadFilenames()
  }

  _loadFilenames() {
    /** the file names as stored on disk - this is used for r/w only, not file uniqueness */
    this.fileNamesOnDisk = Object.fromEntries(
      Object.entries(this.deviceSamples).map(([fileName, fileNameOnDisk]) => [fileNameOnDisk.toLowerCase(), true])
    )

    /** the file names displayed to the user - this is used for uniqueness */
    this.fileNames = Object.fromEntries(
      Object.entries(this.deviceSamples).map(([fileName, fileNameOnDisk]) => [fileName.toLowerCase(), true])
    )
  }

  _fileExists(fileName) {
    return this.fileNames[(fileName).toLowerCase()] || false
  }

  _fileExistsOnDisk(fileName) {
    return this.fileNamesOnDisk[(fileName).toLowerCase()] || false
  }

  _removeFileReference(fileName) {
    delete this.fileNamesOnDisk[this.deviceSamples[fileName].toLowerCase()]
    delete this.fileNames[(fileName).toLowerCase()]
  }

  _addFileReference(fileName) {
    this.fileNamesOnDisk[this.deviceSamples[fileName].toLowerCase()] = true
    this.fileNames[(fileName).toLowerCase()] = true
  }

  _getFormattedFileName(displayName) {
    // drop the extension
    let fileName = displayName.substr(0, displayName.length - Drive.SAMPLE_EXTENSION.length)

    // remove any non-alphanumeric characters
    fileName = fileName.replace(/[^0-9a-z]/gi, '')

    // ideally, use the actual name or some portion of it, truncate it to a max length
    fileName = fileName.substr(0, Drive.MAX_FILENAME_LENGTH)
    if (!this._fileExistsOnDisk(fileName + Drive.SAMPLE_EXTENSION)) {
      return fileName + Drive.SAMPLE_EXTENSION
    }

    // the best filename is already taken
    // start counting up from 0 and replacing characters at the end of the string
    // e.g. bassdrum.wav->bassdru1.wav...bassdr99.wav or kick.wav -> kick1.wav...kick3456.wav
    let count = 0
    let insertPos = fileName.length

    while (true) {
      count = count + 1
      let fileCount = '' + count

      while (insertPos > 0 && insertPos + fileCount.length > Drive.MAX_FILENAME_LENGTH) {
        insertPos--
      }

      if (insertPos === 0) {
        //shit, thats a lot of files with the same name, like d9999999.wav and they want to add more?
        throw new Error("Cannot import sample file")
      }

      let testFileName = fileName.substr(0, insertPos) + fileCount
      if (!this._fileExistsOnDisk(testFileName + Drive.SAMPLE_EXTENSION)) {
        return testFileName + Drive.SAMPLE_EXTENSION
      }
    }
  }
}

export default new SampleStore()
