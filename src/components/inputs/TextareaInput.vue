<!-- TextAreaInput.vue -->
<template>
  <div>
    <label :for="inputId" class="block text-lg font-medium">
      {{ label }}
      <span v-if="!required" class="text-slate-400">(optional)</span>
    </label>
    <div class="relative mt-1">
      <textarea
          :id="inputId"
          :required="required"
          :placeholder="placeholder"
          v-model="innerValue"
          @input="$emit('update:modelValue', innerValue)"
          class="block w-full px-3 py-2 mt-1 text-lg text-gray-700 border focus:outline-none rounded shadow-sm focus:border-blue-500 resize-y h-32"
      ></textarea>
    </div>
  </div>
</template>

<script>
export default {
  name: "TextareaInput",
  props: {
    modelValue: String,
    label: String,
    required: Boolean,
    placeholder: String,
    inputId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      innerValue: this.modelValue,
    };
  },
  watch: {
    modelValue(newVal) {
      this.innerValue = newVal;
    }
  }
}
</script>

<style scoped>
/* Your existing styles can remain here */
</style>