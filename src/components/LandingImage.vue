<script setup lang="ts">
import {ref, onMounted, onUnmounted} from 'vue';
import headImage from './../assets/images/head.png'
import handsImage from './../assets/images/hands.png'

const headBottom = ref(0);
const headImageLoading = ref(true);

const handleScroll = () => {
  const scrollValue = window.scrollY;
  headBottom.value = -scrollValue / 3;
};

const onImageLoad = () => {
  headImageLoading.value = false
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>
<template>
  <div :class="['headline-image', {'loading':headImageLoading}]">
    <transition name="slide-fade-up">
      <img v-show="!headImageLoading" class="head" :src="headImage" alt="landing-cat-image" :style="{ bottom: headBottom + 'px' }" @load="onImageLoad">
    </transition>
    <img class="hands" :src="handsImage" alt="landing-cat-image">
  </div>
</template>

<style scoped lang="scss">
img {
  width: 40%;
}

.headline-image {
  @apply pt-20 w-full relative flex justify-center box-content;
  img {
    max-width: 100%;
  }

  &.loading {
    @apply h-[330px]
  }
}

.head {
  z-index: 0;
  width: 40.5%;
  position: relative;
}

.hands {
  z-index: 2;
  position: absolute;
  bottom: -17%;
  left: 0;
  right: 0;
  margin: auto;
}
</style>
