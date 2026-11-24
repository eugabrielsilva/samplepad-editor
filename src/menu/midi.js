import { getPlatformApi } from 'platform/runtime'
import { isElectron } from 'platform/runtime'

const { midi, mainProcessCallbacks, mainProcessTriggers } = getPlatformApi()

/**
 * Initialize the renderer process handlers for the midi device menu
 */
export const initMidiMenu = () => {
  if (!isElectron) {
    return initMidiMenuCapacitor()
  }

  midi.enable()

  let inputList = midi.getInputList()
  mainProcessTriggers.generateMidiMenu(inputList, (inputList.length ? 0 : null))
  mainProcessCallbacks.setSelectMidiInputCallback(selectMidiMenuItem)
  mainProcessCallbacks.setSelectMidiScanCallback(scanForMidiDevices)

  if (inputList.length) {
    selectMidiMenuItem(0)
  }
}

const initMidiMenuCapacitor = async () => {
  mainProcessCallbacks.setSelectMidiInputCallback(selectMidiMenuItem)
  mainProcessCallbacks.setSelectMidiScanCallback(scanForMidiDevices)

  if (!midi.isAvailable()) {
    return
  }

  await midi.enable()
  const inputList = midi.getInputList()

  if (inputList.length) {
    await selectMidiMenuItem(0)
  }
}

/**
 * Tell the main process to scan for midi devices, when it finds any
 * the menu will be regenerated with available devices
 */
export const scanForMidiDevices = () => {
  if (!isElectron) {
    return scanForMidiDevicesCapacitor()
  }

  midi.scanForMidiDevices();

  let inputList = midi.getInputList()
  mainProcessTriggers.generateMidiMenu(inputList, (inputList.length ? 0 : null))

  if (inputList.length) {
    selectMidiMenuItem(0)
  }
}

const scanForMidiDevicesCapacitor = async () => {
  if (!midi.isAvailable()) {
    return
  }

  await midi.scanForMidiDevices()
  const inputList = midi.getInputList()

  if (inputList.length) {
    await selectMidiMenuItem(0)
  }
}

/**
 * A midi device has been selected from the menu, bind note handlers
 */
export const selectMidiMenuItem = (inputIndex) => {
  return midi.bindMidiInput(inputIndex);
}