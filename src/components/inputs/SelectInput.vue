<template>
  <div>
    <label :for="inputId" class="text-lg font-medium p-0">{{ label }}</label>
    <div class="relative mt-1">
      <select :id="inputId"
              :required="required"
              v-model="innerValue"
              @change="$emit('update:modelValue', innerValue)"
              class="block w-full h-12 px-3 mt-1 text-lg text-gray-700 border bg-white rounded shadow-sm focus:outline-none focus:border-blue-500">
        <option disabled value="">{{ placeholder }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.text }}
        </option>
      </select>
    </div>
  </div>
</template>

<script>
export default {
  name: "SelectInput",
  props: {
    modelValue: {
      type: [String, Number], // Model value can be string or number
      default: ''
    },
    required: Boolean,
    label: {
      type: String,
      required: true
    },
    options: {
      type: Array,
      required: true
    },
    placeholder: {
      type: String,
      default: 'Select an option'
    },
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
  },
  emits: ['update:modelValue']
}
</script>

<style scoped>
.block {
  width: 100%;
  height: auto;
  padding: 8px 12px;
}
</style>
