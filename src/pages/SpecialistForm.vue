<script>
import {setDoc, doc, serverTimestamp} from "firebase/firestore";
import {db} from '../utils/firebaseInit';
import { useAuth } from '../utils/useAuth';

import TextInput from "../components/inputs/TextInput.vue";
import SelectInput from "../components/inputs/SelectInput.vue";
import ImageInput from "../components/inputs/ImageInput.vue";
import FancyButton from "../components/FancyButton.vue";
import MessageBanner from "../components/MessageBanner.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import TextareaInput from "@/components/inputs/TextareaInput.vue";

const { isUserPermitted, user, signInWithGoogle } = useAuth();

export default {
  name: "SpecialistForm",
  components: {TextareaInput, LoadingSpinner, TextInput, FancyButton, SelectInput, ImageInput, MessageBanner},
  data() {
    const initFormData = {
      name: '',
      years: 0,
      comment: ''
    }

    return {
      formData: initFormData,
      isLoading: false,
      message: '',
      initFormData,
      user,
      signInWithGoogle
    };
  },
  methods: {
    resetErrorMessage() {
      this.message = null;
    },
    resetForm() {
      this.formData = this.initFormData;
    },
    async submitForm() {
      this.isLoading = true;

      try {
        // Add a new document in collection of requests
        await setDoc(doc(db, "specialistRequests", user.value?.uid),
            {
              ...this.formData,
              email: user.value?.email ?? 'unknown',
              createdAt: serverTimestamp(),
              status: 'wait'
            });
        this.message = {text: `Request sent, please wait until approval`, color: 'green'}
        this.resetForm()
      } catch (e) {
        console.error("Error adding document: ", e);
        this.message = {text: 'Error while sending request, try again later please', color: 'red' }
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
      <h1>Please fill data about you</h1>
      <MessageBanner v-if="message" class="mb-5" :message="message.text" :color="message.color" @onClose="resetErrorMessage"/>
      <div v-if="isLoading" class="flex justify-center m-24">
        <LoadingSpinner/>
      </div>
      <form @submit.prevent="submitForm" class="flex gap-8" v-if="!isLoading">
        <div class="information flex flex-col gap-3">
          <TextInput
              label="Name"
              type="text"
              placeholder="Full name"
              inputId="name-input"
              :required="true"
              v-model="formData.name"
          />
          <TextInput
              label="Years of experience"
              type="number"
              placeholder="Years of experience"
              inputId="age-input"
              :required="true"
              v-model="formData.years"
          />
          <TextareaInput
              label="Additional comment"
              inputId="comment"
              :required="false"
              v-model="formData.comment"
          />

          <FancyButton text="Confirm request" type="submit" class="mt-2 self-end"/>
        </div>
      </form>
    </div>
    <div class="centered-card centered-card--mini !p-16" v-else>
      <div class="flex mt-2 items-center flex-col gap-10">
        <h1>Log in send request</h1>
        <FancyButton text="Log in now" size="lg" @click="signInWithGoogle"/>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.centered-card {
  @apply w-4/12
}

form,
input,
.information,
button {
  @apply w-full
}
</style>
