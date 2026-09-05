import { mount } from 'svelte'
import { Capacitor } from '@capacitor/core'
import { defineCustomElements as defineJeepSqlite } from 'jeep-sqlite/loader'
import { defineCustomElements as defineIonic } from '@ionic/core/loader'
import './app.css'
import App from './App.svelte'
import { migrate } from './database/migrate'
import { createCapacitorSqliteDriver, getSqliteConnection } from './database/drivers/capacitorSqliteDriver'
import { initNotifications } from './notifications/notificationService'

async function bootstrap() {
  await defineIonic(window)

  if (Capacitor.getPlatform() === 'web') {
    await defineJeepSqlite(window)
    const jeepEl = document.createElement('jeep-sqlite')
    jeepEl.setAttribute('wasmPath', `${import.meta.env.BASE_URL}assets`)
    document.body.appendChild(jeepEl)
    await customElements.whenDefined('jeep-sqlite')
    await getSqliteConnection().initWebStore()
  }

  const driver = createCapacitorSqliteDriver()
  await migrate(driver)
  await initNotifications(driver)

  mount(App, { target: document.getElementById('app')! })
}

bootstrap()
