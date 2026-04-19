import { createRouter, createWebHistory } from "vue-router";
import AboutView from "./components/AboutView.vue";
import HomeView from "./components/HomeView.vue";
import SearchView from "./components/SearchView.vue";

export const routes = [
  { path: "/", component: HomeView },
  { path: "/about", component: AboutView },
  { path: "/search", component: SearchView }
]
export default createRouter({
  routes: routes,
  history: createWebHistory()
})