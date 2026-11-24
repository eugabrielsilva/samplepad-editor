import { initializePlatform } from 'platform/runtime'

initializePlatform()
  .then(() => import('./bootstrap'))
  .then(({ bootstrap }) => bootstrap())
  .catch((error) => {
    console.error('Unable to initialize the application.', error)
    const root = document.getElementById('root')
    root.innerHTML = '<p style="padding:2rem">Unable to initialize the application.</p>'
  })
