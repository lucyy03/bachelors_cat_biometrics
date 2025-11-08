<template>
  <div class="flex items-start w-full">
    <label for="range-input" class="w-[100px]">{{ label }}</label>
    <div class="relative flex-1">
      <input
          id="range-input"
          type="range"
          :value="value"
          :min="min"
          :max="max"
          :step="step"
          @input="$emit('update:modelValue', Number($event.target.value))"
      >
      <span class="helper-text start-0">{{ minLabel }}</span>
      <span class="helper-text start-1/3 -translate-x-1/2 rtl:translate-x-1/2">{{ oneThirdLabel }}</span>
      <span class="helper-text start-2/3 -translate-x-1/2 rtl:translate-x-1/2">{{ twoThirdsLabel }}</span>
      <span class="helper-text end-0">{{ maxLabel }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: "SelectInput",
  props: {
    modelValue: Number,
    label: String,
    min: {
      type: Number,
      default: 100
    },
    max: {
      type: Number,
      default: 1500
    },
    step: {
      type: Number,
      default: 1
    }
  },
  computed: {
    value() {
      return this.modelValue;
    },
    minLabel() {
      return `${this.min}`;
    },
    maxLabel() {
      return `${this.max}`;
    },
    oneThirdLabel() {
      const oneThird = this.min + (this.max - this.min) / 3;
      return `${Math.round(oneThird)}`;
    },
    twoThirdsLabel() {
      const twoThirds = this.min + (this.max - this.min) * 2 / 3;
      return `${Math.round(twoThirds)}`;
    }
  },
  emits: ['update:modelValue']
}
</script>

<style scoped>
label {
  @apply text-2xl
}

input {
  @apply w-full h-5 bg-gray-200 rounded-lg appearance-none cursor-pointer;
}

.helper-text {
  @apply text-gray-500 absolute -bottom-6
}

input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 30px; /* Size of the handle */
  height: 30px; /* Size of the handle */
  background: #950cde; /* Color of the handle */
  cursor: pointer; /* Cursor changes to pointer when hovering over the handle */
  border-radius: 50%; /* Round shape */
}
</style>
