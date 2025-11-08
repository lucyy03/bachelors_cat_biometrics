<template>
  <div>
    <LayoutHeader title="Analyses"/>
    <div class="content w-full">
      <div v-if="isLoading" class="flex justify-center items-center m-20">
        <LoadingSpinner/>
      </div>
      <div v-else class="container w-full">
        <div class="overflow-x-auto">
          <div v-if="Object.keys(averages).length"
               class="mb-4 bg-gray-50 p-4 border border-gray-200 rounded glowing hover:bg-gray-100 transition-all cursor-pointer"
               :class="{ 'real-glowing': isCalculatingAverages }"
               @click="toggleAverages">
            <h3 class="text-lg font-semibold flex justify-between items-center">
              <span class="flex gap-5 items-center">
                <font-awesome-icon icon="refresh" class="transition-all hover:rotate-180"
                                   @click.stop="calculateAverages"/>
                Properties
              </span>
              <font-awesome-icon icon="chevron-down" class="transition-all" :class="{'rotate-180': showAverages}"/>
            </h3>
            <div v-show="showAverages" class="">
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                <div v-for="(value, key) in analyseProperties" :key="key" @click="goToProperty(key)"
                     class="hover:underline">
                  <span class="font-bold">{{ value.customTitle || key }}:</span>
                  {{ typeof value.value === 'number' ? value.value.toFixed(2) : value.toFixed(2) }}
                </div>
              </div>
              <h4 class="mt-5 text-xl">Averages</h4>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                <div v-for="(value, key) in averages" :key="key" @click="goToProperty(key)"
                     class="hover:underline">
                  <span class="font-medium">{{ key }}:</span> {{ value.toFixed(2) }}
                </div>
              </div>
            </div>
          </div>
          <button v-else @click="calculateAverages" class="px-4 py-2">
            Calculate Averages
          </button>
          <h2 class="text-2xl mt-6 mb-4">Analyses <span class="text-slate-400 font-light">({{ analyses.length }})</span>
          </h2>
          <table class="min-w-full bg-white border border-gray-300">
            <thead>
            <tr class="bg-gray-100">
              <th class="text-left p-4 border-b border-gray-300 font-semibold">ID</th>
              <th class="text-left p-4 border-b border-gray-300 font-semibold">Created At</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="analysis in analyses" :key="analysis.id" @click="goToDetail(analysis.id)"
                v-tippy="{ content: '<img src=' + analysis.originalImageUrl + ' style=\'max-height: 300px;\' />', allowHTML: true, placement: 'bottom' }"
                class="hover:bg-gray-100 transition-all cursor-pointer">
              <td class="p-4 border-b border-gray-300 flex gap-2 items-center">
                <div class="indicator" v-if="!analysis.seen"></div>
                {{ analysis.id }}
              </td>
              <td class="p-4 border-b border-gray-300">{{ analysis.createdAt?.toDate().toLocaleString() || '-' }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {onMounted, ref} from 'vue';
import {db} from '../utils/firebaseInit';
import {auth} from '../utils/firebaseInit';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  where,
  query,
  onSnapshot,
  setDoc,
  orderBy
} from 'firebase/firestore';
import LayoutHeader from "../components/LayoutHeader.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import {onAuthStateChanged} from "firebase/auth";
import {useRouter} from 'vue-router';

const router = useRouter();
const users = ref([]);
const specialistRequests = ref([]);
const analyses = ref([]);
const averages = ref({});
const analyseProperties = ref({});
const isLoading = ref(true);
const showAverages = ref(false);
const isCalculatingAverages = ref(false);

// Fetch specialist requests
async function fetchRequests() {
  const q = query(collection(db, "specialistRequests"), where("status", "==", "wait"));
  const specialistRequestsSnapshot = await getDocs(q);
  specialistRequests.value = specialistRequestsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// Fetch analyses from Firestore
function fetchAnalyses() {
  const q = query(collection(db, "analyses"), orderBy("createdAt", "desc"));
  onSnapshot(q, (querySnapshot) => {
    analyses.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  });
}

const fullPropertyAnalyse = ['eyes.spaceBetween']

async function fetchAverages() {
  const averagesDocRef = doc(db, 'data', 'averages');
  const snapshot = await getDoc(averagesDocRef);
  if (snapshot.exists()) {
    averages.value = snapshot.data();
  }
}

async function fetchProperties() {
  const propertiesDocRef = doc(db, 'data', 'properties');
  const snapshot = await getDoc(propertiesDocRef);
  if (snapshot.exists()) {
    const propertiesData = snapshot.data();
    analyseProperties.value = {};

    function traverse(obj, path = []) {
      for (const key in obj) {
        const value = obj[key];
        const newPath = [...path, key];
        if (value?.customTitle) {
          const flatKey = newPath.join('.');
          if (averages.value[flatKey] !== undefined) {
            analyseProperties.value[flatKey] = {
              value: averages.value[flatKey],
              customTitle: value.customTitle
            };
          }
        } else if (typeof value === 'object' && value !== null) {
          traverse(value, newPath);
        }
      }
    }

    traverse(propertiesData);
  }
}

function goToDetail(id) {
  router.push(`/analyse/${id}`);
}

function goToProperty(code) {
  router.push(`/property/${code}`);
}

async function calculateAverages() {
  isCalculatingAverages.value = true;
  const numericProps = {};

  analyses.value.forEach(analysis => {
    function traverse(obj, path = []) {
      for (const key in obj) {
        if (key === 'createdAt') continue;
        const value = obj[key];
        const newPath = [...path, key];
        if (typeof value === 'number') {
          const propPath = newPath.join('.');
          if (!numericProps[propPath]) numericProps[propPath] = [];
          numericProps[propPath].push(value);
        } else if (typeof value === 'object' && value !== null) {
          traverse(value, newPath);
        }
      }
    }

    traverse(analysis);
  });

  const averages = {};
  for (const key in numericProps) {
    const values = numericProps[key];
    averages[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  const averagesDocRef = doc(db, 'data', 'averages');
  await setDoc(averagesDocRef, averages);
  isCalculatingAverages.value = false;
  showAverages.value = true;
}

function toggleAverages(event) {
  if (event.target.closest('.fa-refresh')) return;
  showAverages.value = !showAverages.value;
}

onMounted(() => {
  onAuthStateChanged(auth, async (currentUser) => {
    isLoading.value = true;
    if (!currentUser) {
      await router.push('/');
    } else {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data().role === 'ADMIN') {
        await fetchRequests();
        fetchAnalyses();
        await fetchAverages();
        await fetchProperties();
        isLoading.value = false;
      } else {
        await router.push('/');
      }
    }
  });
});
</script>

<style scoped lang="scss">
table {
  td {
    @apply border-0 align-baseline;
  }

  button {
    @apply w-28 bg-white border-slate-400 text-black ;
  }
}

.indicator {
  @apply w-2 h-2 rounded-full bg-blue-400;
}

.glowing:before {
  z-index: 1;
  opacity: 0;
  pointer-events: none;
  transition: opacity .5s;
}

.real-glowing:before {
  opacity: .2;
}
</style>
