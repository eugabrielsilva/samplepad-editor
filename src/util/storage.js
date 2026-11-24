/* Global imports */
import { WaveFile } from 'wavefile'

/* App imports */
import { Drive } from 'const'
import { getBuffer } from 'util/buffer'
import { getKitFileBuffer } from 'util/kitFile'
import { getPlatformApi, isElectron } from 'platform/runtime'

const { store, fs, path } = getPlatformApi()

/**
 * Store the directory for next time the app opens
 * @param {String} directory
 */
export function storeLastLoadedDirectory(directory) {
  if (isElectron) {
    store.save('lastLoadedDirectory', directory);
    return;
  }

  return store.save('lastLoadedDirectory', directory)
}

/**
 * @return {String} the directory used last time the application was open
 */
export function getLastLoadedDirectory() {
  return store.get('lastLoadedDirectory');
}

/**
 * Copy a source sample to the sample directory
 * @param {String} source
 * @return {String} new sample file path
 * @return {String} new sample file name
 */
export function copySample(source, destinationDirectory, newFileName=false) {
  if (!isElectron) {
    return copySampleCapacitor(source, destinationDirectory, newFileName)
  }

  let sourcePath = path.parse(source);

  if (!newFileName) {
    newFileName = sourcePath.base;
  }

  let destination = destinationDirectory + "/" + newFileName;

  try {
    // The samples files must be 16-bit, mono or stereo .WAV files.
    // with a sample rate of 48K, 44.1K, 32K, 22.05K, and 11.025K.
    let buffer = getBuffer(source);
    let wav = new WaveFile(buffer);

    if (parseInt(wav.bitDepth, 10) !== 16) {
      wav.toBitDepth("16");
    }

    if (![48000,44100,32000,22050,11025].includes(wav.fmt.sampleRate)) {
      wav.toSampleRate(44100);
    }

    fs.writeFile(destination, wav.toBuffer());
    return destination;
  } catch (err) {
    console.error(err)
    throw(err);
  }
}

const copySampleCapacitor = async (source, destinationDirectory, newFileName=false) => {
  const sourcePath = path.parse(source)

  if (!newFileName) {
    newFileName = sourcePath.base
  }

  const destination = destinationDirectory + "/" + newFileName

  try {
    const buffer = await getBuffer(source)
    const wav = new WaveFile(buffer)

    if (parseInt(wav.bitDepth, 10) !== 16) {
      wav.toBitDepth("16")
    }

    if (![48000, 44100, 32000, 22050, 11025].includes(wav.fmt.sampleRate)) {
      wav.toSampleRate(44100)
    }

    await fs.writeFile(destination, wav.toBuffer())
    return destination
  } catch (error) {
    console.error(error)
    throw error
  }
}

/**
 * @param {KitModel} kit
 * @param {Boolean} asNew
 * @returns {Boolean} true if the kit would clobber another
 */
export const kitWillOverwriteExisting = (kit, asNew = false) => {
  if (!isElectron) {
    return kitWillOverwriteExistingCapacitor(kit, asNew)
  }

  if(!fs.exists(kit.filePath)) {
    return false;
  }

  let desiredFileName = kit.kitName + Drive.KIT_EXTENSION;
  let currentFileName = kit.fileName;
  let kitFile = kit.filePath + "/" + desiredFileName;

  if (!currentFileName || currentFileName.toUpperCase() !== desiredFileName.toUpperCase()) {
    return fs.exists(kitFile);
  }

  return false;
}

const kitWillOverwriteExistingCapacitor = async (kit, asNew = false) => {
  if (!await fs.exists(kit.filePath)) {
    return false
  }

  const desiredFileName = kit.kitName + Drive.KIT_EXTENSION
  const currentFileName = kit.fileName
  const kitFile = kit.filePath + "/" + desiredFileName

  if (!currentFileName || currentFileName.toUpperCase() !== desiredFileName.toUpperCase()) {
    return fs.exists(kitFile)
  }

  return false
}

/**
 * @param {RootModel} drive
 * @param {KitModel} kit
 * @param {PadModel[]} pads
 * @param {Boolean} asNew
 * @returns {String} the file name the kit was stored as
 */
export const saveKitToFile = (drive, kit, pads, asNew = false) => {
  if (!isElectron) {
    return saveKitToFileCapacitor(drive, kit, pads, asNew)
  }

  if(!fs.exists(kit.filePath)) {
    // need to create the kits directory
    fs.mkdir(kit.filePath);
  }

  let desiredFileName = kit.kitName + Drive.KIT_EXTENSION;
  let currentFileName = kit.fileName;

  if (asNew) {
    // the kit is being stored as a new kit, drop the reference to the old file
    currentFileName = null;
  }

  let kitFile = kit.filePath + "/" + desiredFileName;
  try {
    if (currentFileName && desiredFileName !== currentFileName && !asNew) {
      // we need to rename the file first
      fs.renameFile(kit.filePath + "/" + currentFileName, kitFile);
    }

    fs.writeFile(kitFile, getKitFileBuffer(drive, kit, pads))
  } catch (err) {
    console.error(err);
    throw(err);
  }

  return desiredFileName;
}

const saveKitToFileCapacitor = async (drive, kit, pads, asNew = false) => {
  if (!await fs.exists(kit.filePath)) {
    await fs.mkdir(kit.filePath)
  }

  const desiredFileName = kit.kitName + Drive.KIT_EXTENSION
  let currentFileName = kit.fileName

  if (asNew) {
    currentFileName = null
  }

  const kitFile = kit.filePath + "/" + desiredFileName

  try {
    if (currentFileName && desiredFileName !== currentFileName && !asNew) {
      await fs.renameFile(kit.filePath + "/" + currentFileName, kitFile)
    }

    await fs.writeFile(kitFile, getKitFileBuffer(drive, kit, pads))
  } catch (error) {
    console.error(error)
    throw error
  }

  return desiredFileName
}
