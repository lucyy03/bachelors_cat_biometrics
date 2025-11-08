<script setup>
import {onMounted, ref, watch} from 'vue';
import {db} from '../utils/firebaseInit';
import {collection, getDocs, orderBy, query} from 'firebase/firestore';
import LayoutHeader from "../components/LayoutHeader.vue";
import CatPreview from '../components/CatPreview.vue';
import LoadingSpinner from "../components/LoadingSpinner.vue";

const cats = ref([]);
const isLoading = ref(false);
const sortField = ref("addedAt"); // default sort field
const sortOrder = ref("desc"); // default sort order

async function fetchCats(field = "addedAt", order = "desc") {
  isLoading.value = true;
  const catsQuery = query(collection(db, "cats"), orderBy(field, order));
  const querySnapshot = await getDocs(catsQuery);
  cats.value = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  isLoading.value = false;
}

// Refetch when sortField or sortOrder changes
watch([sortField, sortOrder], ([newField, newOrder]) => {
  fetchCats(newField, newOrder);
});

onMounted(() => {
  fetchCats();
});
</script>

<template>
  <div>
    <LayoutHeader title="List of cats"/>
    <div class="content w-full">
      <div class="container">
        <!-- Sorting controls -->
        <div class="flex justify-end items-center mb-4">
          <label for="field">Sort by:</label>
          <select id="field" v-model="sortField" class="ml-2 p-1 border rounded">
            <option value="addedAt">Date Added</option>
            <option value="averageScore">Average Score</option>
          </select>

          <label for="order" class="ml-8">Order:</label>
          <select id="order" v-model="sortOrder" class="ml-2 p-1 border rounded">
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        <div v-if="isLoading" class="flex justify-center items-center m-20">
          <LoadingSpinner/>
        </div>

        <div v-else class="flex gap-10 flex-wrap">
          <CatPreview
              v-for="cat in cats"
              :key="cat.id"
              :id="cat.id"
              :name="cat.name"
              :breed="cat.breed"
              :age="cat.age"
              :averageScore="cat.averageScore"
              :reviewCount="cat.reviewCount"
              :imageSrc="cat.imageUrl"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.content {
 @apply pt-10
}
</style>
