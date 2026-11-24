import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'

import store from 'state/store'
import { initEditMenu } from 'menu/edit'
import { initMidiMenu } from 'menu/midi'
import { initDeviceTypeMenu } from 'menu/deviceType'
import { loadDrive } from 'actions/drive'
import { showNotice } from 'actions/notice'
import { getLastLoadedDirectory } from 'util/storage'
import { isElectron, isIos, getPlatformInitializationErrors } from 'platform/runtime'

import App from 'component/App'
import 'css/bulma.min.css'
import 'css/bulma-tooltip.min.css'
import 'css/icons.css'
import 'css/index.scss'

export const bootstrap = async () => {
  initEditMenu()
  initDeviceTypeMenu()

  if (isElectron) {
    initMidiMenu()
  } else if (isIos) {
    try {
      await initMidiMenu()
    } catch (error) {
      console.error('Unable to initialize MIDI.', error)
      store.dispatch(showNotice(
        'is-warning',
        'MIDI could not be initialized. Editing and WAV playback remain available.'
      ))
    }

    const initializationErrors = getPlatformInitializationErrors()
    const lastLoadedDirectory = getLastLoadedDirectory()

    if (lastLoadedDirectory && !initializationErrors.length) {
      try {
        await store.dispatch(loadDrive(lastLoadedDirectory))
      } catch (error) {
        console.error('Unable to restore the last selected SD card.', error)
        store.dispatch(showNotice(
          'is-warning',
          'The previous SD card could not be reopened. Select it again in the app.'
        ))
      }
    }

    initializationErrors.forEach((error) => {
      console.error('Unable to restore SD card access.', error)
    })

    if (initializationErrors.length) {
      store.dispatch(showNotice(
        'is-warning',
        'Access to the previous SD card expired. Select the card again.'
      ))
    }
  }

  const root = createRoot(document.getElementById('root'))
  root.render(
    <Provider store={store}>
      <App />
    </Provider>
  )
}
