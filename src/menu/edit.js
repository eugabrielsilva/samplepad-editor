/* App imports */
import store from 'state/store'
import { selectAndLoadDrive } from 'actions/drive'
import { getPlatformApi } from 'platform/runtime'

const { mainProcessCallbacks } = getPlatformApi()

/**
 * Initialize the renderer process handlers for the menu
 */
export const initEditMenu = () => {
  mainProcessCallbacks.setLoadSDCardCallback(loadSDCard)
}

/**
 * "Load SD Card" has been selected from the menu
 */
export const loadSDCard = () => {
  return store.dispatch(selectAndLoadDrive());
}