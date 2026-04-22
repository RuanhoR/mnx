import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { LoginStatus } from './utils/loginStatus'

// initialize login status (load token from storage and verify)
LoginStatus.Init();

createApp(App).use(router).mount('#app')
