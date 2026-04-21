import { createRouter, createWebHistory } from "vue-router";
import AboutView from "./components/AboutView.vue";
import HomeView from "./components/HomeView.vue";
import SearchView from "./components/SearchView.vue";
import AccountView from "./components/AccountView.vue";
import LoginCallbackView from "./components/LoginCallbackView.vue";

export const routes = [
  { path: "/", component: HomeView },
  { path: "/about", component: AboutView },
  { path: "/search", component: SearchView },
  { path: "/account", component: AccountView },
  { path: "/_callback", component: LoginCallbackView }
]
export default createRouter({
  routes: routes,
  history: createWebHistory()
})