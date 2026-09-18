import { Capacitor } from '@capacitor/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import './index.css'
import './i18n'
import App from './App.tsx'

// Registers the fallback camera-modal UI Capacitor's Camera plugin needs in a plain browser
// (the real native Android camera is used automatically when running inside the app itself).
defineCustomElements(window)
document.documentElement.classList.toggle('native-app', Capacitor.isNativePlatform())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
