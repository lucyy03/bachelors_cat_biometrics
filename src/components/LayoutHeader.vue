<script setup lang="ts">
import {defineProps} from 'vue';

const props = defineProps<{
  title?: String;
}>()
</script>
<template>
  <div class="container py-9 text-slate-100">
    <h1 v-if="props.title">
      {{ props.title }}
    </h1>
  </div>
</template>

<style scoped>
h1 {
  @apply pt-10;
}
</style>
