import { Capacitor } from '@capacitor/core'

export const isElectron = Boolean(typeof window !== 'undefined' && window.api)
export const isIos = !isElectron && Capacitor.getPlatform() === 'ios'
export const isCapacitor = !isElectron && Capacitor.isNativePlatform()

let platformApi
let initialization
let initializationErrors = []

export const initializePlatform = () => {
  if (isElectron) {
    platformApi = window.api
    return Promise.resolve(platformApi)
  }

  if (!initialization) {
    initialization = import('platform/capacitor/api')
      .then(({ createCapacitorApi }) => createCapacitorApi())
      .then(({ api, errors = [] }) => {
        platformApi = api
        initializationErrors = errors
        return api
      })
  }

  return initialization
}

export const getPlatformApi = () => {
  if (!platformApi) {
    throw new Error('Platform API has not been initialized')
  }

  return platformApi
}

export const getPlatformInitializationErrors = () => initializationErrors.slice()
