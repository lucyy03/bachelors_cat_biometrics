<template>
  <label for="dropzone-file"
         class="w-full flex flex-col items-center justify-center p-2 border-4 border-slate-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-100 text-xl text-center">
    <div v-if="!previewUrl" class="m-2">
      <font-awesome-icon icon="cloud-arrow-up" fixed-width/>
      <p class="mb-2 text-gray-500"><span class="font-semibold">Click to upload </span> image</p>
      <p class="text-md text-gray-500">PNG or JPG</p>
    </div>
    <input id="dropzone-file" type="file" :required="required" class="hidden" @change="onFileChange" ref="fileInput" accept=".png, .jpg, .jpeg"/>
    <img v-if="previewUrl" :src="previewUrl" alt="File preview" class="preview-image"/>
  </label>
</template>

<script>
import {ref} from 'vue';

export default {
  name: "ImageInput",
  props: {
    required: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  setup(props, {emit}) {
    const previewUrl = ref('');
    const fileInput = ref(null);  // Ref for the file input element

    function onFileChange(event) {
      const files = event.target.files;
      if (files.length > 0) {
        const file = files[0];
        previewUrl.value = URL.createObjectURL(file); // Create a preview URL
        emit('update:modelValue', file); // Emit the file to the parent component
      }
    }

    return {onFileChange, previewUrl, fileInput};
  }
}
</script>
<style scoped>
* {
  transition: .1s;
}
</style>
