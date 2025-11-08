<!-- TextInput.vue -->
<template>
  <div>
    <label :for="inputId" class="block text-lg font-medium">
      {{ label }}
      <span v-if="!required" class="text-slate-400">(optional)</span>
    </label>
    <div class="relative mt-1">
      <input :type="type"
             :id="inputId"
             :required="required"
             :placeholder="placeholder"
             v-model="innerValue"
             @input="$emit('update:modelValue', innerValue)"
             class="block w-full h-12 px-3 pb-1 mt-1 text-lg text-gray-700 border focus:outline-none rounded shadow-sm focus:border-blue-500">
    </div>
  </div>
</template>

<script>
export default {
  name: "TextInput",
  props: {
    modelValue: String,
    label: String,
    required: Boolean,
    type: {
      type: String,
      default: 'text' // default is text if type is not specified
    },
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
