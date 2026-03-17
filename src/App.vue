<script setup lang="ts">
import PageNavigation from "./components/PageNavigation.vue";
import PageFooter from "./components/PageFooter.vue";
import AuthSuccessOverlay from "./components/AuthSuccessOverlay.vue";
import {onMounted} from "vue";
import {useAuth} from "./utils/useAuth";

const {initGoogleRedirectResult} = useAuth();

onMounted(() => {
	initGoogleRedirectResult();
});
</script>

<template>
  <PageNavigation/>
  <AuthSuccessOverlay/>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component"/>
    </transition>
  </router-view>
  <PageFooter/>
</template>

<style scoped lang="scss">

</style>
