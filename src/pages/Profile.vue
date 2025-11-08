<script setup>
import {onMounted, ref, watchEffect} from 'vue';
import {db} from '../utils/firebaseInit';
import {collection, getDocs, getDoc, doc} from 'firebase/firestore';
import LayoutHeader from "../components/LayoutHeader.vue";
import CatPreview from '../components/CatPreview.vue';
import LoadingSpinner from "../components/LoadingSpinner.vue";
import { useAuth } from '../utils/useAuth';
import MessageBanner from "../components/MessageBanner.vue";
import TagText from "@/components/TagText.vue";
const { user, getUserRole } = useAuth();

const cats = ref([]);
const isLoading = ref(true);
const role = ref(null);
const specialistRequestsStatus = ref(null);

const getRequestStatusText = (status) => {
  if (status === 'approved'){
    return 'Approved for specialist'
  } else if (status === 'denied'){
    return 'Denied for specialist'
  }
  return 'Waiting for approval to specialist'
}

async function fetchCats() {
  if (!user.value) {
    console.log("User is not logged in, skipping fetchCats");
    return;
  }
  isLoading.value = true;

  try {
    // Step 1: Get the user's reviews collection
    const userReviewsSnapshot = await getDocs(collection(db, "users", user.value?.uid, "reviews"));

    if (userReviewsSnapshot.empty) {
      cats.value = []; // No reviews found
      isLoading.value = false;
      return;
    }

    // Step 2: Extract the cat IDs from the user's reviews
    const reviewedCatIds = userReviewsSnapshot.docs.map(doc => doc.id);

    // Step 3: Get each reviewed cat document by its ID
    const catPromises = reviewedCatIds.map(catId => {
      const catDocRef = doc(db, "cats", catId);
      return getDoc(catDocRef);
    });

    // Step 4: Await all cat documents
    const catDocs = await Promise.all(catPromises);

    // Step 5: Map the results to the `cats` array
    cats.value = catDocs
        .filter(catDoc => catDoc.exists())
        .map(catDoc => ({
          id: catDoc.id,
          ...catDoc.data()
        }));

  } catch (error) {
    console.error("Error fetching cats: ", error);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchCats();
});

watchEffect(async () => {
  if (user.value) {
    fetchCats();
    role.value = await getUserRole()

    if (role.value === 'BREEDER') {
      const specialistRequestDoc = await getDoc(doc(db, "specialistRequests", user?.value.uid));
      specialistRequestsStatus.value = specialistRequestDoc.exists() ? specialistRequestDoc.data().status : null;
      console.log(specialistRequestsStatus.value)
    }
  }
});
</script>

<template>
  <div>
    <LayoutHeader title="About you"/>
    <div class="content w-full">
      <div v-if="isLoading" class="flex justify-center items-center m-20">
        <LoadingSpinner/>
      </div>
      <div class="container" v-else>
        <h2>Profile</h2>
        <div class="pb-5 flex w-fit flex-col rounded-xl bg-slate-200 p-5 gap-5" v-if="user">
          <div class="text-2xl">
            <strong>{{ user?.displayName}}</strong> <span class="text-slate-500">({{ user?.email }})</span>
          </div>
          <TagText :color="specialistRequestsStatus === 'denied' ? 'error' : 'warning'" v-if="role === 'BREEDER' && specialistRequestsStatus" :text="getRequestStatusText(specialistRequestsStatus)" class="w-fit"/>
          <TagText :text="role" class="w-fit lowercase first-letter:uppercase" v-else/>
          <router-link to="/specialist-form" v-if="role === 'BREEDER' && (!specialistRequestsStatus || specialistRequestsStatus === 'denied')" >
            <button class="secondary bg-white">Sign up to specialist</button>
          </router-link>
        </div>
        <h2> Reviewed cats </h2>
        <div class="flex gap-10 flex-wrap">
          <CatPreview
              v-for="cat in cats"
              v-if="cats.length>0"
              :key="cat.id"
              :id="cat.id"
              :name="cat.name"
              :breed="cat.breed"
              :age="cat.age"
              :averageScore="cat.averageScore"
              :reviewCount="cat.reviewCount"
              :imageSrc="cat.imageUrl"
          />
          <MessageBanner class="w-full" v-else message="You haven't reviewed any cats yet" :visibleClose="false" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.content {
  padding-top: 2rem;
}
h2 {
  @apply text-3xl mb-3 mt-6
}
</style>
