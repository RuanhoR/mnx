<template>
  <div class="about__title">{{ getI18n("AboutTitle") }}</div>
  <div class="about__content">
    <div style="width: 10%;height: 1px;"></div>
    <span>{{ getI18n("AboutContent") }}</span>
    <div style="width: 10%;height: 1px;"></div>
  </div>
</template>
<script setup lang="ts">
import { getI18n } from "././././../i18n"
</script>
<style lang="css" scoped>
.about__title {
  font-size: 40px;
  display: flex;
  justify-content: center;
  width: 100%;
  position: relative;
  padding: 30px;
}
.about__content {
  font-size: 16px;
  display: flex;
  justify-content: center;
  width: 100%;
  height: 400px;
  position: relative;
}
</style>