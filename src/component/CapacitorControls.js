import React, { useState } from 'react'
import { connect } from 'react-redux'

import { DeviceType } from 'const'
import { scanForMidiDevices } from 'menu/midi'
import { getPlatformApi } from 'platform/runtime'
import { showNotice } from 'actions/notice'

const { midi, mainProcessTriggers } = getPlatformApi()

const CapacitorControlsComponent = (props) => {
  const [midiInputs, setMidiInputs] = useState(midi.getInputList())
  const [midiInput, setMidiInput] = useState(midiInputs.length ? '0' : '')
  const midiAvailable = midi.isAvailable?.() ?? true

  const selectMidiInput = async (value) => {
    try {
      await mainProcessTriggers.selectMidiInput(value === '' ? null : Number(value))
      setMidiInput(value)
    } catch (error) {
      console.error('Unable to open MIDI input.', error)
      props.showError('There was a problem opening the MIDI input.')
    }
  }

  const scanMidi = async () => {
    try {
      await scanForMidiDevices()
      const inputs = midi.getInputList()
      setMidiInputs(inputs)
      setMidiInput(inputs.length ? '0' : '')
    } catch (error) {
      console.error('Unable to scan MIDI devices.', error)
      props.showError('There was a problem scanning MIDI devices.')
    }
  }

  const selectDeviceType = async (deviceType) => {
    try {
      await mainProcessTriggers.selectDeviceType(deviceType)
    } catch (error) {
      console.error('Unable to update device type.', error)
      props.showError('There was a problem changing the device type.')
    }
  }

  return (
    <div className="capacitor-controls">
      <div className="field is-grouped is-grouped-multiline">
        <div className="control">
          <button className="button is-small is-light" onClick={props.loadCard}>
            Load SD Card
          </button>
        </div>

        <div className="control">
          <div className="select is-small">
            <select
              aria-label="SamplePad device model"
              value={props.deviceType}
              onChange={(event) => selectDeviceType(event.target.value)}>
              <option value={DeviceType.SAMPLERACK}>SampleRack</option>
              <option value={DeviceType.SAMPLEPAD_PRO}>SamplePad Pro</option>
            </select>
          </div>
        </div>

        <div className="control">
          <div className="select is-small">
            <select
              aria-label="MIDI input"
              disabled={!midiAvailable || !midiInputs.length}
              value={midiInput}
              onChange={(event) => selectMidiInput(event.target.value)}>
              <option value="">
                {midiAvailable ? 'MIDI: none' : 'MIDI unavailable'}
              </option>
              {midiInputs.map(([index, name]) => (
                <option key={index} value={index}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="control">
          <button
            className="button is-small is-light"
            disabled={!midiAvailable}
            onClick={scanMidi}>
            Scan MIDI
          </button>
        </div>
      </div>
    </div>
  )
}

const mapStateToProps = (state) => ({
  deviceType: state.drive.deviceType
})

const mapDispatchToProps = (dispatch) => ({
  showError: (message) => dispatch(showNotice('is-danger', message))
})

export default connect(mapStateToProps, mapDispatchToProps)(CapacitorControlsComponent)
