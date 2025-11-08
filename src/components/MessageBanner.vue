<template>
  <div :class="containerClasses">
    <strong class="block" v-html="message"/>
    <font-awesome-icon v-if="visibleClose" icon="xmark" fixed-width :class="`cursor-pointer text-${color}-500`" @click="closeAlert"/>
  </div>
</template>

<script lang="ts">

export default {
  name: "MessageBanner",
  props: {
    color: {
      type: String,
      default: 'blue',
    },
    message: {
      type: String,
      required: true
    },
    onClose: {
      type: Function,
      default: null
    },
    visibleClose: {
      type: Boolean,
      default: true
    }
  },
  methods: {
    closeAlert() {
      this.$emit('onClose');
    }
  },
  computed: {
    containerClasses() {
      return `flex justify-between items-center bg-${this.color}-100 border-${this.color}-400 text-${this.color}-700 px-4 py-3 rounded relative`;
    }
  }
}
</script>

<style scoped>
/* Additional styles can be added here */
</style>
