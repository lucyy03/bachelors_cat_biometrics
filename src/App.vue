<script setup lang="ts">
import PageNavigation from "./components/PageNavigation.vue";
import PageFooter from "./components/PageFooter.vue";
</script>

<template>
  <PageNavigation/>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component"/>
    </transition>
  </router-view>
  <PageFooter/>
</template>

<style scoped lang="scss">

</style>