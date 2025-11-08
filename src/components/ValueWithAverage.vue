<script lang="ts">
export default {
  name: 'ValueWithAverage',
  props: {
    value: {
      type: [Number, String],
      required: true,
    },
    average: {
      type: Number,
      default: null,
    },
  },
  computed: {
    difference(): string {
      if (this.average === null || typeof this.value !== 'number') return '';
      const percent = ((this.value - this.average) / this.average) * 100;
      return `(${percent > 0 ? '+' : ''}${percent.toFixed(1)}%)`;
    },
    differenceClass(): string {
      if (this.average === null || typeof this.value !== 'number') return 'text-slate-500';
      const percent = ((this.value - this.average) / this.average) * 100;
      return Math.abs(percent) > 5 ? 'font-bold text-red-500' : 'text-slate-500';
    },
  },
};
</script>

<template>
  {{ value }}
  <span :class="['text-xs', 'italic', differenceClass]">{{ difference }}</span>
</template>