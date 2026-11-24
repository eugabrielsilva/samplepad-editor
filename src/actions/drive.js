/* App imports */
import { Actions } from 'const';
import { confirmLoadCard } from 'actions/modal';
import { showNotice } from 'actions/notice';
import { getGlobalStateFromDirectory } from 'state/globalState';
import { openDriveDirectoryDialog } from 'util/fileDialog';
import { storeLastLoadedDirectory } from 'util/storage';
import { isElectron } from 'platform/runtime'

/** DRIVE ACTION CREATORS */
/**
 * Open a file dialog, and parse the resulting directory as a SamplePad drive
 */
export function selectAndLoadDrive(confirmedLoadCard=false) {
  if (!isElectron) {
    return selectAndLoadDriveCapacitor(confirmedLoadCard)
  }

  return (dispatch, getState) => {
    let state = getState()

    // show the warning modal - on confirm, load the card
    // todo: only do this if some information hasnt been saved
    if (state.drive.deviceId && !confirmedLoadCard) {
      dispatch(confirmLoadCard((result) => {
        return (dispatch, getState) => {
          if (result) {
            dispatch(selectAndLoadDrive(true));
          }
        }

      }));
      return;
    }

    openDriveDirectoryDialog()
      .then(result => {

        if (result.canceled) {
          return null;
        }

        storeLastLoadedDirectory(result.filePaths[0]);
        dispatch(loadDrive(result.filePaths[0]));
        dispatch(
          showNotice("is-success", "SD card and any existing samples and kits have been successfully loaded.")
        );
      })
  }
}

function selectAndLoadDriveCapacitor(confirmedLoadCard=false) {
  return (dispatch, getState) => {
    const state = getState()

    if (state.drive.deviceId && !confirmedLoadCard) {
      dispatch(confirmLoadCard((result) => {
        return (dispatch) => {
          if (result) {
            return dispatch(selectAndLoadDrive(true))
          }

          return null
        }
      }))
      return
    }

    return openDriveDirectoryDialog()
      .then(async (result) => {
        if (result.canceled) {
          return null
        }

        await storeLastLoadedDirectory(result.filePaths[0])
        await dispatch(loadDrive(result.filePaths[0]))
        dispatch(showNotice(
          "is-success",
          "SD card and any existing samples and kits have been successfully loaded."
        ))

        return null
      })
      .catch((error) => {
        console.error('Unable to load SD card.', error)
        dispatch(showNotice("is-danger", "There was a problem loading this SD card."))
        return null
      })
  }
}

/**
 * Parse kits, samples, and drive details from the given directory
 * @param {String} drivePath - root path of the SamplePad drive
 */
export function loadDrive(drivePath) {
  if (!isElectron) {
    return loadDriveCapacitor(drivePath)
  }

  return (dispatch) => {
      let {drive, kits} = getGlobalStateFromDirectory(drivePath);

      // resetting to beginning state
      dispatch({ type: Actions.SET_SELECTED_KIT_ID, kitId: null });
      dispatch({ type: Actions.SET_ACTIVE_KIT_ID, kitId: null });

      // load all the drive details
      dispatch({ type: Actions.LOAD_DRIVE, drive: drive });
      dispatch({ type: Actions.RESET_KITS, kits: kits });
      dispatch({ type: Actions.SORT_KITS });
  }
}

function loadDriveCapacitor(drivePath) {
  return async (dispatch) => {
    const { drive, kits } = await getGlobalStateFromDirectory(drivePath)

    dispatch({ type: Actions.SET_SELECTED_KIT_ID, kitId: null })
    dispatch({ type: Actions.SET_ACTIVE_KIT_ID, kitId: null })
    dispatch({ type: Actions.LOAD_DRIVE, drive })
    dispatch({ type: Actions.RESET_KITS, kits })
    dispatch({ type: Actions.SORT_KITS })
  }
}
