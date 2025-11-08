<template>
  <span :class="pillClasses">{{ text }}</span>
</template>

<script setup>
import { computed, defineProps } from 'vue';

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    default: 'success',
    validator: (value) => ['success', 'warning', 'error'].includes(value),
  },
});

const pillClasses = computed(() => {
  return [
    'inline-block',
    'px-4',
    'py-1',
    'rounded-full',
    'font-semibold',
    'text-sm',
    'border-2',
    'border-gray-300',
    {
      'bg-green-200 border-green-500': props.color === 'success',
      'bg-yellow-200 border-yellow-300': props.color === 'warning',
      'bg-red-200 border-red-300': props.color === 'error',
    },
  ];
});
</script>

<style scoped>
</style>
