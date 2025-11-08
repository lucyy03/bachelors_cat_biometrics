<template>
  <div class="user-preview p-5 border border-gray-300 rounded-lg bg-white shadow-lg flex flex-col items-center">
    <img :src="profilePicture" alt="Profile Picture" class="w-20 h-20 rounded-full object-cover mb-4"/>
    <div class="user-info text-center">
      <h3 class="text-lg font-semibold mb-2">{{ name }}</h3>
      <p class="text-sm text-gray-600 mb-1">Email: {{ email }}</p>
      <p class="text-sm text-gray-600">Role: {{ role }}</p>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';

// Define the props for UserPreview
const props = defineProps({
  id: String,
  name: String,
  email: String,
  profilePicture: String,
  role: String,
});
</script>

<style scoped>
/* No custom styles are needed, everything is handled by Tailwind */
</style>
