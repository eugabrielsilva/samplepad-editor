const callbacks = {
  midiInput: [],
  midiScan: [],
  deviceType: [],
  loadSdCard: []
}

const addCallback = (list, callback) => {
  list.push(callback)
  return () => {
    const index = list.indexOf(callback)
    if (index !== -1) {
      list.splice(index, 1)
    }
  }
}

export const capacitorCallbacks = {
  setSelectMidiInputCallback: (callback) => addCallback(callbacks.midiInput, callback),
  setSelectMidiScanCallback: (callback) => addCallback(callbacks.midiScan, callback),
  setSelectDeviceTypeCallback: (callback) => addCallback(callbacks.deviceType, callback),
  setLoadSDCardCallback: (callback) => addCallback(callbacks.loadSdCard, callback)
}

export const capacitorTriggers = {
  generateMidiMenu: () => {},
  setDeviceType: () => {},
  selectMidiInput: (inputIndex) => Promise.all(
    callbacks.midiInput.map((callback) => callback(inputIndex))
  ),
  scanMidi: () => Promise.all(
    callbacks.midiScan.map((callback) => callback())
  ),
  selectDeviceType: (deviceType) => Promise.all(
    callbacks.deviceType.map((callback) => callback(deviceType))
  ),
  loadSdCard: () => Promise.all(
    callbacks.loadSdCard.map((callback) => callback())
  )
}
