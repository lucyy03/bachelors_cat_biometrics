<script lang="ts">
import {onMounted, ref, watchEffect} from 'vue';
import {db} from '../utils/firebaseInit';
import {
  setDoc,
  updateDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import LayoutHeader from "../components/LayoutHeader.vue";
import MessageBanner from "../components/MessageBanner.vue";
import FancyButton from "../components/FancyButton.vue";
import RangeInput from "../components/inputs/RangeInput.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import {capitalizeFirstLetter} from "../utils/strings";
import {useAuth} from "../utils/useAuth";
import {Cat, CatReview} from "../types/cats";

const {user, isUserPermitted, getIsAdmin, getUserRole} = useAuth();
const isUserPermittedRef = ref(false);
const isAdmin = ref(false);

// Check user permissions when component mounts or when the user changes
watchEffect(async () => {
  if (user.value) {
    isUserPermittedRef.value = await isUserPermitted();
    isAdmin.value = await getIsAdmin();
  } else {
    isUserPermittedRef.value = false;
    isAdmin.value = false;
  }
});

export default {
  name: "CatInformation",
  components: {LayoutHeader, LoadingSpinner, MessageBanner, RangeInput, FancyButton},
  data() {
    return {
      isLoading: true,
      message: {text: '', color: ''},
      isImageLoading: true
    };
  },
  props: {
    id: String,
  },
  computed: {
    getUserId(): string | null {
      return user.value?.uid ?? null
    },
    getBreed() {
      if (!this.catDetails?.breed) {
        return ''
      }
      return capitalizeFirstLetter(this.catDetails.breed)
    },
    getScore() {
      return (this.formData.ears + this.formData.mouth + this.formData.eyes + this.formData.chin + this.formData.nose) / 5
    },
    getName() {
      if (!this.catDetails?.name) {
        return ''
      }
      return capitalizeFirstLetter(this.catDetails.name)
    },
    ageText() {
      const age = this.catDetails?.age ?? 0;

      if (age === 0) {
        return "Kitten";
      } else {
        let suffix = 'years';
        if (age === 1) {
          suffix = 'year';
        }
        return `${age} ${suffix}`;
      }
    }
  },
  methods: {
    resetErrorMessage() {
      this.message = {text: '', color: ''};
    },
    onImageLoaded() {
      this.isImageLoading = false;
    },
    async removeItem() {
      if (!this.catDetails?.id) {
        return;
      }

      const isAdmin = await getIsAdmin()
      if (!isAdmin) {
        this.message = {text: 'Not permitted!.', color: 'green'};
        return
      }

      try {
        await deleteDoc(doc(db, "cats", this.catDetails.id));
        this.message = {text: 'Cat successfully removed.', color: 'green'};
        window.location.href = '/cats-list';
      } catch (error) {
        console.error('Error removing document: ', error);
        this.message = {text: 'Error while removing the cat', color: 'red'};
      }
    },
    async blockAuthor() {
      if (!this.catDetails?.addedBy) {
        console.error("No author email available to block");
        return;
      }
      try {
        // Find the user by email in the "users" collection
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", this.catDetails.addedBy));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.error("No user found with the given email");
          this.message = {text: 'No user found to block.', color: 'red'};
          return;
        }

        // Update the first matching user's document
        const userDoc = querySnapshot.docs[0];
        await updateDoc(userDoc.ref, {blocked: true});

        this.message = {text: 'Author successfully blocked.', color: 'green'};
      } catch (error) {
        console.error('Error blocking author: ', error);
        this.message = {text: 'Error while blocking the author', color: 'red'};
      }
    },
    formatTimestamp(timestamp: any) {
      if (timestamp && timestamp.seconds) {
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleString('sk-SK'); // Converts to readable date and time format
      }
      return 'Unknown';
    },
    async submitForm() {
      this.isLoading = true

      // First, check if blocked
      const isPermitted = await isUserPermitted();
      if (!isPermitted) {
        this.message = {text: 'You are not permitted to do this action', color: 'red'}
        this.isLoading = false;
        return
      }
      const userRole = await getUserRole();

      const reviewData = {
        ears: this.formData.ears,
        eyes: this.formData.eyes,
        mouth: this.formData.mouth,
        chin: this.formData.chin,
        nose: this.formData.nose,
        overallScore: this.getScore,
        timestamp: serverTimestamp(),
        role: userRole
      };

      try {
        if (!this.catDetails || !this.getUserId) {
          return
        }
        // add review to cat
        await setDoc(doc(db, "cats", this.catDetails.id, "reviews", this.getUserId), reviewData, {merge: true});

        // add copy of review to user
        await setDoc(doc(db, "users", this.getUserId, "reviews", this.catDetails.id), reviewData, {merge: true});

        // Fetch all reviews to recalculate the average score
        const reviewsRef = collection(db, "cats", this.catDetails.id, "reviews");
        const reviewSnapshot = await getDocs(reviewsRef);

        let totalScore = 0;
        let totalWeight = 0;
        reviewSnapshot.forEach(doc => {
          const review = doc.data();
          const weight = (review.role === 'ADMIN' || review.role === 'SPECIALIST') ? 2 : 1;
          totalScore += review.overallScore * weight;
          totalWeight += weight;
        });
        const newAverageScore = totalWeight > 0 ? totalScore / totalWeight : 0;
        const newReviewCount = reviewSnapshot.size;

        // Update the cat document with new average score and review count
        await updateDoc(doc(db, "cats", this.catDetails.id), {
          averageScore: newAverageScore,
          reviewCount: newReviewCount
        });

        // update cat data
        this.catDetails.reviewCount = newReviewCount
        this.catDetails.averageScore = newAverageScore
        this.message = {text: 'Rating updated', color: 'green'};
      } catch (error) {
        console.error('Error adding document: ', error);
        this.message = {text: 'Error while adding your rating', color: 'red'};
      }
      this.isLoading = false
    },
  },
  setup(props) {
    const catDetails = ref<Cat | null>(null);
    const formData = ref({
      ears: 5,
      eyes: 5,
      mouth: 5,
      nose: 5,
      chin: 5,
    });
    const loggedUserReview = ref<CatReview | null>(null);
    const isLoading = ref<Boolean>(false);

    async function fetchCat() {
      isLoading.value = true;
      const catId = `${props.id}`;
      const catDocRef = doc(db, "cats", catId);
      const catDocSnap = await getDoc(catDocRef);

      if (catDocSnap.exists()) {
        catDetails.value = {
          id: catDocSnap.id,
          ...catDocSnap.data()
        } as Cat;

        if (user.value?.uid) {
          const reviewDocRef = doc(db, "cats", catDocSnap.id, "reviews", `${user.value?.uid}`);
          const reviewSnap = await getDoc(reviewDocRef);

          if (reviewSnap.exists()) {
            loggedUserReview.value = reviewSnap.data() as CatReview;
            if (loggedUserReview.value) {
              formData.value = {
                ears: loggedUserReview.value?.ears ?? 5,
                eyes: loggedUserReview.value?.eyes ?? 5,
                mouth: loggedUserReview.value?.mouth ?? 5,
                chin: loggedUserReview.value?.chin ?? 5,
                nose: loggedUserReview.value?.nose ?? 5,
              };
            }
          } else {
            loggedUserReview.value = null
            console.log("No review by user found.");
          }
        }
      } else {
        console.error("No such cat found!");
      }
      isLoading.value = false;
    }

    onMounted(() => {
      fetchCat();
    });

    return {catDetails, isLoading, loggedUserReview, formData, isUserPermittedRef, isAdmin};
  }
}
</script>

<template>
  <div class="container w-4/6">
    <div v-if="!isLoading && catDetails && isAdmin"
         class="flex justify-between bg-slate-200 py-3 px-5 items-center mb-5 rounded-2xl">
      <div class="flex flex-col gap-2" v-if="catDetails?.addedBy">
        <div>
          <div class="inline-block w-20 mr-1">Created by</div>
          <strong>{{ catDetails?.addedBy }}</strong></div>
        <div>
          <div class="inline-block w-20">Created at</div>
          <strong>{{ formatTimestamp(catDetails?.addedAt) }}</strong></div>
      </div>
      <div class="flex gap-4">
        <button class="button secondary mini danger" @click="blockAuthor">
          <font-awesome-icon icon="xmark"/>
          Block user
        </button>
        <button class="button secondary mini danger" @click="removeItem">
          <font-awesome-icon icon="trash"/>
          Remove
        </button>
      </div>
    </div>
    <MessageBanner v-if="message.text" class="mb-5" :message="message.text" :color="message.color"
                   @onClose="resetErrorMessage"/>
    <div v-if="isLoading && isImageLoading" class="flex justify-center items-center m-20">
      <LoadingSpinner/>
    </div>
    <div v-else-if="!!catDetails"
         :class="['content-loading', 'flex', 'gap-8', { 'is-loaded': !isLoading && !isImageLoading }]">
      <div class="image">
        <div class="image-container">
          <img :src="catDetails.imageUrl" :alt="`Obrázok macky menom ${catDetails.name}`" @load="onImageLoaded">
        </div>
      </div>
      <div class="information flex-1 flex gap-3 flex-col">
        <h2 class="text-5xl">{{ getName }}</h2>
        <table class="text-2xl">
          <tr>
            <td>Breed</td>
            <td>{{ getBreed }}</td>
          </tr>
          <tr>
            <td>Age</td>
            <td>{{ ageText }}</td>
          </tr>
          <tr>
            <td>Reviews count</td>
            <td>{{ catDetails.reviewCount }}</td>
          </tr>
          <tr v-if="!!catDetails.reviewCount">
            <td>Average rating</td>
            <td v-if="!!catDetails.reviewCount">{{ Math.round(catDetails.averageScore) }}<span
                class="text-slate-500 font-normal">/10</span></td>
          </tr>
        </table>
        <form class="flex flex-col gap-2 flex-1 my-8" @submit.prevent="submitForm" v-if="isUserPermittedRef">
          <div class="flex flex-col flex-1 gap-10">
            <RangeInput v-model="formData.ears" :min="0" :max="10" label="Ears"/>
            <RangeInput v-model="formData.mouth" :min="0" :max="10" label="Mouth"/>
            <RangeInput v-model="formData.eyes" :min="0" :max="10" label="Eyes"/>
            <RangeInput v-model="formData.chin" :min="0" :max="10" label="Chin"/>
            <RangeInput v-model="formData.nose" :min="0" :max="10" label="Nose"/>
          </div>
          <div class="mt-5 self-end flex items-center gap-5 pt-2">
            <span class="text-slate-500 text-lg">Your rating </span>
            <div class="text-3xl">{{ Math.round(getScore) }} <span class="text-slate-500">/10</span></div>
            <FancyButton :text="!!loggedUserReview ? 'Edit' : 'Submit'" type="submit"/>
          </div>
        </form>
      </div>
    </div>
    <MessageBanner v-else class="mb-5" message="Cat was not found" color="red" :visible-close="false"/>
  </div>
</template>

<style scoped lang="scss">
.image-container {
  @apply flex-1 overflow-hidden;
  width: 400px;
  height: 65vh;

  img {
    @apply rounded-tl-lg rounded-bl-lg w-full h-full;
    object-fit: cover;
    object-position: center;
  }
}

table tr {
  td:first-child {
    @apply text-slate-700;
    width: 300px;
  }

  td:last-child {
    @apply font-bold;
  }
}
</style>
