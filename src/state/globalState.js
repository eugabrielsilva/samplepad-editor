/* Global imports */
import { v1 as uuidv1 } from 'uuid';

/* App imports */
import { Drive, DeviceType } from 'const';
import { RootModel, KitModel } from 'state/models';
import SampleStore from 'util/sampleStore';
import { resetDeviceType } from 'menu/deviceType'
import { getPlatformApi, isElectron } from 'platform/runtime'

const { fs } = getPlatformApi()

/**
 * @param {String} rootPath
 * @return {RootModel, KitModel[]}
 */
export const getGlobalStateFromDirectory = (rootPath) => {
  if (!isElectron) {
    return getGlobalStateFromDirectoryCapacitor(rootPath)
  }

  if(!fs.exists(rootPath)) {
    throw new Error("Invalid directory")
  }

  let {deviceId, deviceType} = getDeviceDetailsFromDirectory(rootPath)
  let kits = {};
  let kitPath = rootPath + "/" + Drive.KIT_DIRECTORY;

  SampleStore.loadSamplesFromDirectory(deviceId, rootPath)

  if(fs.exists(kitPath)) {
    let kitFiles = fs.getKitFiles(kitPath)

    kitFiles.forEach((kitFile) => {
      let kit = KitModel(kitPath, kitFile.name, null, true, null, kitFile.name.slice(0, -4));
      kits[kit.id] = kit;
    });
  }

  let drive = RootModel(deviceId, deviceType, rootPath, kitPath, Object.keys(SampleStore.getSamples()));

  // set the menu to this drive's device type
  resetDeviceType(deviceType);

  return {drive, kits};
}

const getGlobalStateFromDirectoryCapacitor = async (rootPath) => {
  if (!await fs.exists(rootPath)) {
    throw new Error("Invalid directory")
  }

  const { deviceId, deviceType } = await getDeviceDetailsFromDirectoryCapacitor(rootPath)
  const kits = {}
  const kitPath = rootPath + "/" + Drive.KIT_DIRECTORY

  await SampleStore.loadSamplesFromDirectory(deviceId, rootPath)

  if (await fs.exists(kitPath)) {
    const kitFiles = await fs.getKitFiles(kitPath)

    kitFiles.forEach((kitFile) => {
      const kit = KitModel(
        kitPath,
        kitFile.name,
        null,
        true,
        null,
        kitFile.name.slice(0, -4)
      )
      kits[kit.id] = kit
    })
  }

  const drive = RootModel(
    deviceId,
    deviceType,
    rootPath,
    kitPath,
    Object.keys(SampleStore.getSamples())
  )

  resetDeviceType(deviceType)

  return { drive, kits }
}

const getDeviceDetailsFromDirectory = (devicePath) => {
  let deviceId = uuidv1()
  let deviceFile = devicePath + "/" + Drive.DEVICE_ID_FILE
  let deviceType = DeviceType.SAMPLERACK;

  let writeFile = true;

  // look for an existing device id on the card
  if(fs.exists(deviceFile)) {
    let deviceDetails = fs.readFileAsArrayByLine(deviceFile);
    deviceId = deviceDetails[0];

    if (deviceDetails.length > 1) {
      writeFile = false;
      deviceType = deviceDetails[1];
    }
  }

  if (writeFile) {
    writeDeviceDetailsToFile(devicePath, deviceId, deviceType)
  }

  return {deviceId, deviceType}
}

const getDeviceDetailsFromDirectoryCapacitor = async (devicePath) => {
  let deviceId = uuidv1()
  const deviceFile = devicePath + "/" + Drive.DEVICE_ID_FILE
  let deviceType = DeviceType.SAMPLERACK
  let writeFile = true

  if (await fs.exists(deviceFile)) {
    const deviceDetails = await fs.readFileAsArrayByLine(deviceFile)
    deviceId = deviceDetails[0]

    if (deviceDetails.length > 1) {
      writeFile = false
      deviceType = deviceDetails[1]
    }
  }

  if (writeFile) {
    await writeDeviceDetailsToFileCapacitor(devicePath, deviceId, deviceType)
  }

  return { deviceId, deviceType }
}

export const writeDeviceDetailsToFile = (devicePath, deviceId, deviceType) => {
  if (!isElectron) {
    return writeDeviceDetailsToFileCapacitor(devicePath, deviceId, deviceType)
  }

  // todo: should probably store config data as json in device file
  let deviceFile = devicePath + "/" + Drive.DEVICE_ID_FILE
  let deviceDetails = deviceId + "\n";
  deviceDetails += deviceType + "\n";

  fs.writeFile(deviceFile, deviceDetails)
}

const writeDeviceDetailsToFileCapacitor = async (devicePath, deviceId, deviceType) => {
  const deviceFile = devicePath + "/" + Drive.DEVICE_ID_FILE
  let deviceDetails = deviceId + "\n"
  deviceDetails += deviceType + "\n"

  await fs.writeFile(deviceFile, deviceDetails)
}
