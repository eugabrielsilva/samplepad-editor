/* Global imports */
import { createStore, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk';

/* App imports */
import reducers from 'state/reducers'
import { restoreLastSelectedKit } from 'actions/app';

/* Initalize React App */
const store = createStore(reducers, applyMiddleware(thunk));
store.dispatch(restoreLastSelectedKit());

export default store;