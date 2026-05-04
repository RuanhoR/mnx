import { createRouter, createWebHistory } from "vue-router";
import AboutView from "./components/AboutView.vue";
import HomeView from "./components/HomeView.vue";
import SearchView from "./components/SearchView.vue";
import AccountView from "./components/AccountView.vue";
import LoginCallbackView from "./components/LoginCallbackView.vue";
import PackageView from "./components/PackageView.vue";
import NotFound from "./components/NotFound.vue";

export const routes = [
  { path: "/", component: HomeView },
  { path: "/about", component: AboutView },
  { path: "/search", component: SearchView },
  { path: "/account", component: AccountView },
  { path: "/_callback", component: LoginCallbackView },
  { path: "/package/:scope/:name", component: PackageView },
  {
    path: '/:pathMatch(.*)*',
    component: NotFound
  }
]
export default createRouter({
  routes: routes,
  history: createWebHistory()
})