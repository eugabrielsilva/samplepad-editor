import { CapacitorMIDIDevice, MidiMessageType } from '@eugabrielsilva/capacitor-midi-device'

const noteOnCallbacks = {}
let inputNames = []
let selectedInput = null
let initialization
let messageListener
let connectionListener

const refreshDevices = async () => {
  const { value } = await CapacitorMIDIDevice.listMIDIDevices()
  inputNames = value

  if (selectedInput !== null && selectedInput >= inputNames.length) {
    selectedInput = null
  }

  return inputNames
}

const handleMidiMessage = (message) => {
  if (selectedInput === null || message.type !== MidiMessageType.NoteOn) {
    return
  }

  const callbacks = noteOnCallbacks[message.note]

  if (!callbacks) {
    return
  }

  Object.values(callbacks).forEach((handler) => {
    if (message.velocity >= handler.min && message.velocity <= handler.max) {
      handler.callback({
        ...message,
        rawVelocity: message.velocity
      })
    }
  })
}

const enable = async () => {
  if (!initialization) {
    initialization = Promise.all([
      CapacitorMIDIDevice.addListener('MIDI_MSG_EVENT', handleMidiMessage)
        .then((handle) => {
          messageListener = handle
        }),
      CapacitorMIDIDevice.addListener('MIDI_CON_EVENT', ({ value }) => {
        inputNames = value
      }).then((handle) => {
        connectionListener = handle
      }),
      CapacitorMIDIDevice.initConnectionListener()
    ]).then(refreshDevices)
  }

  await initialization
}

const bindMidiInput = async (inputIndex) => {
  if (inputIndex === null) {
    selectedInput = null
    return
  }

  if (!inputNames[inputIndex]) {
    throw new Error(`MIDI input ${inputIndex} is not available`)
  }

  await CapacitorMIDIDevice.openDevice({ deviceNumber: inputIndex })
  selectedInput = inputIndex
}

export const capacitorMidi = {
  enable,
  isAvailable: () => true,
  getInputList: () => inputNames.map((name, index) => [index, name]),
  bindMidiInput,
  scanForMidiDevices: async () => {
    await enable()
    await refreshDevices()
  },
  addMidiNoteOnHandler: (handlerId, note, min, max, callback) => {
    noteOnCallbacks[note] ||= {}
    noteOnCallbacks[note][handlerId] = { min, max, callback }
  },
  removeMidiNoteOnHandler: (handlerId, note) => {
    if (noteOnCallbacks[note]) {
      delete noteOnCallbacks[note][handlerId]
    }
  }
}

export const releaseCapacitorMidi = async () => {
  await Promise.all(
    [messageListener, connectionListener]
      .filter(Boolean)
      .map((listener) => listener.remove())
  )
  messageListener = undefined
  connectionListener = undefined
  initialization = undefined
  selectedInput = null
}
