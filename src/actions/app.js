/* App imports */
import { Actions } from 'const';
import { loadKitDetails } from 'actions/kit';
import { getLastSelectedKit, storeLastSelectedKit } from 'util/storage';

/** APP ACTION CREATORS */
/**
 * set the dropdown's selected kit and set it as currently active
 * @param {String} kitId
 */
export function selectKit(kitId) {
  return (dispatch, getState) => {
    let state = getState();
    let kit = state.kits.models[kitId];

    // if the kit isnt loaded, load it before activating it
    dispatch(loadKitDetails(kitId));

    storeLastSelectedKit(state.drive.deviceId, kit.fileName);

    // set it as the selected and active kit
    dispatch({ type: Actions.SET_SELECTED_KIT_ID, kitId: kitId });
    dispatch({ type: Actions.SET_ACTIVE_KIT_ID, kitId: kitId });
  }
}

/**
 * Restore the last kit selected for the currently loaded device.
 */
export function restoreLastSelectedKit() {
  return (dispatch, getState) => {
    let state = getState();
    let fileName = getLastSelectedKit(state.drive.deviceId);

    if (!fileName) {
      return;
    }

    let kitId = Object.keys(state.kits.models).find((id) => {
      let kitFileName = state.kits.models[id].fileName;
      return kitFileName && kitFileName.toLowerCase() === fileName.toLowerCase();
    });

    if (kitId) {
      dispatch(selectKit(kitId));
    }
  }
}
