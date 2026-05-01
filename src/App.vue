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
  <div class="app-shell">
    <PageNavigation/>
    <AuthSuccessOverlay/>
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component"/>
        </transition>
      </router-view>
    </main>
    <PageFooter/>
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1 0 auto;
}
</style>
