<script>
import {addDoc, collection, serverTimestamp} from "firebase/firestore";
import {db} from '../utils/firebaseInit';
import { useAuth } from '../utils/useAuth';
import {getDownloadURL, getStorage, ref as firebaseStorageRef, uploadBytes} from 'firebase/storage';
import imageCompression from 'browser-image-compression';

import TextInput from "../components/inputs/TextInput.vue";
import SelectInput from "../components/inputs/SelectInput.vue";
import ImageInput from "../components/inputs/ImageInput.vue";
import FancyButton from "../components/FancyButton.vue";
import MessageBanner from "../components/MessageBanner.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";

const { isUserPermitted, user, signInWithGoogle } = useAuth();

export default {
  name: "NewCatForm",
  components: {LoadingSpinner, TextInput, FancyButton, SelectInput, ImageInput, MessageBanner},
  data() {
    const defaultBreed = 'ragdoll';
    const initFormData = {
      breed: defaultBreed,
      name: '',
      age: 0,
      comment: '',
    }

    return {
      formData: initFormData,
      breedOptions: [
        {value: 'ragdoll', text: 'Ragdoll'},
      ],
      imageFile: '',
      imagePreviewUrl: '',
      message: null,
      isLoading: false,
      initFormData,
      user,
      signInWithGoogle
    };
  },
  watch: {
    'imageFile'(newFile) {
      if (newFile) {
        this.imagePreviewUrl = URL.createObjectURL(newFile);
        this.imageFile = newFile;
      }
    }
  },
  methods: {
    resetErrorMessage() {
      this.message = null;
    },
    resetForm() {
      this.formData = this.initFormData;
      this.imageFile = '';
      this.imagePreviewUrl = '';
    },
    async submitForm() {
      if (!this.imageFile) {
        this.message = {text: 'Photo is not selected', color: 'red'}
        return
      }
      this.isLoading = true;

      // First, check if blocked
      const isPermitted = await isUserPermitted();
      if (!isPermitted) {
        this.message = {text: 'You are not permitted to do this action', color: 'red'}
        this.isLoading = false;
        return
      }

      try {
        const storage = getStorage();

        // Set compression options to ensure the file is below 2 MB
        const options = {
          maxSizeMB: 3,       // Set maximum size in MB
          maxWidthOrHeight: 1920, // Optional: resize based on width or height
          useWebWorker: true,
        };

        // Compress the image
        const compressedFile = await imageCompression(this.imageFile, options);

        // Upload the compressed file
        const storageRef = firebaseStorageRef(storage, `cats/${compressedFile.name}`);
        const snapshot = await uploadBytes(storageRef, compressedFile);

        this.formData.imageUrl = await getDownloadURL(snapshot.ref);
      } catch (e) {
        console.error('Failed to upload image:', e);
        this.message = {text: 'Error while uploading a image', color: 'red'}
        return;
      }

      try {
        // Add a new document in collection "cats"
        const docRef = await addDoc(collection(db, "cats"),
            {
              ...this.formData,
              reviewCount: 0,
              averageScore: 5,
              addedBy: user.value?.email ?? 'unknown',
              addedAt: serverTimestamp(),
            });
        this.message = {text: `Cat was successfuly added. <a href="/cat/${docRef.id}" class="underline">Display this cat</a>.`, color: 'green'}
        this.resetForm()
      } catch (e) {
        console.error("Error adding document: ", e);
        this.message = {text: 'Error while adding a image', color: 'red'}
      } finally {
        this.isLoading = false;
      }
    }
  }
}
</script>

<template>
  <div class="center-child">
    <div class="centered-card" v-if="user">
      <h1>Insert data about a cat</h1>
      <MessageBanner v-if="message" class="mb-5" :message="message.text" :color="message.color" @onClose="resetErrorMessage"/>
      <div v-if="isLoading" class="flex justify-center m-24">
        <LoadingSpinner/>
      </div>
      <form @submit.prevent="submitForm" class="flex gap-8" v-if="!isLoading">
        <ImageInput v-model="imageFile"/>
        <div class="information flex flex-col gap-3">
          <SelectInput
              label="Breed"
              :options="breedOptions"
              inputId="breed-select"
              v-model="formData.breed"
              placeholder="Select breed"
              :required="true"
          />
          <TextInput
              label="Name"
              type="text"
              placeholder="Type a name"
              inputId="name-input"
              :required="false"
              v-model="formData.name"
          />
          <TextInput
              label="Age (years)"
              type="number"
              placeholder="Type a age"
              inputId="age-input"
              :required="false"
              v-model="formData.age"
          />
          <FancyButton text="Submit" type="submit" class="mt-2 self-end"/>
        </div>
      </form>
    </div>
    <div class="centered-card centered-card--mini !p-16" v-else>
      <div class="flex mt-2 items-center flex-col gap-10">
        <h1>Log in to verify your cat</h1>
        <FancyButton text="Log in now" size="lg" @click="signInWithGoogle"/>
      </div>
    </div>
  </div>
</template>


<style scoped lang="scss">
.file-and-info {
  display: flex;
  align-items: stretch;
  width: 100%;
}
</style>
