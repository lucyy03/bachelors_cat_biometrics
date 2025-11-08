<script setup lang="ts">
import {onMounted, ref, watchEffect} from 'vue';
import FancyButton from "../components/FancyButton.vue";
import LandingImage from "../components/LandingImage.vue";
import {useAuth} from "../utils/useAuth";

const {user, signInWithGoogle, isUserPermitted} = useAuth();
const showButtons = ref(false);
const showSubtitle = ref(false);
const isUserPermittedRef = ref(false);

watchEffect(async () => {
  if (user.value) {
    isUserPermittedRef.value = await isUserPermitted();
  } else {
    isUserPermittedRef.value = false;
  }
});

onMounted(() => {
  setTimeout(() => {
    showButtons.value = true;
  }, 500);
  setTimeout(() => {
    showSubtitle.value = true;
  }, 1);
});
</script>

<template>
  <div>
    <LandingImage/>
    <div class="content text-center">
      <div class="container flex flex-col items-center gap-10 w-4/6">
        <div class="headline">
          <h1>Analyze biometrics of cats</h1>
          <transition name="slide-fade-down">
            <h3 v-show="showSubtitle" class="mt-3 uppercase text-slate-400">(Currently only Ragdoll breed)</h3>
          </transition>
        </div>
        <transition name="slide-fade-down">
          <div v-if="!!showButtons" class="flex flex-row items-center gap-5">
            <router-link to="/upload-cat">
              <FancyButton text="Upload your cat" size="lg"/>
            </router-link>
            <button class="secondary large" v-if="!user" @click="signInWithGoogle">Log in as an breeder</button>
          </div>
        </transition>
        <div v-if="!showButtons" class="h-[76px]"></div>
        <a href="#content"
           class="bounce-animation relative -top-1 rounded-full border-2 border-slate-400 hover:border-slate-500 text-slate-600 px-3 py-2 cursor-pointer">
          <font-awesome-icon icon="arrow-down" fixed-width/>
        </a>
        <hr id="content">
        <p class="text-xl tracking-wide">
          Lorem ipsum dolor sit amet, <strong>consectetur adipisicing</strong> elit. Ad animi commodi dignissimos, eos excepturi facere
          facilis fugit illum ipsa labore molestiae natus quae quam qui quos repudiandae <strong>sequi</strong> unde. Officiis.
        </p>
        <h4 class="info-headline">What parameters decide?</h4>
        <p class="info-paragraph">
          Lorem ipsum dolor sit amet, consectetur <strong>adipisicing elit</strong>. Ad animi commodi dignissimos, eos excepturi facere
          facilis fugit illum ipsa labore molestiae natus quae quam qui quos repudiandae sequi unde. Officiis.
        </p>
        <h4 class="info-headline">Who decides?</h4>
        <p class="info-paragraph">
          Lorem ipsum dolor sit amet, <strong>consectetur</strong> adipisicing elit. Ad animi commodi dignissimos, eos excepturi facere
          facilis fugit illum ipsa <strong> labore molestiae</strong> natus quae quam qui quos repudiandae sequi unde. Officiis.
        </p>
        <h4 class="info-headline">Supported breeds</h4>
        <p class="info-paragraph">
          Lorem ipsum dolor sit amet, <strong>consectetur</strong> adipisicing elit. Ad animi commodi dignissimos, eos excepturi facere
          facilis fugit illum ipsa <strong> labore molestiae</strong> natus quae quam qui quos repudiandae sequi unde. Officiis.
        </p>
        <p class="info-paragraph">
          Do you have all the answers and want to find out what your pet's features are? <a href="/upload-cat" class="link-button" title="Find out here">Find out here</a>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
h1 {
  font-size: 4em;
  letter-spacing: 2px;
  text-transform: uppercase;
}

hr {
  border-color: #c0c0c0;
  @apply w-3/6 my-12
}

.info-headline {
  @apply text-4xl text-left block w-full mt-5 uppercase
}

.info-paragraph {
  @apply text-xl text-left w-full
}
</style>
