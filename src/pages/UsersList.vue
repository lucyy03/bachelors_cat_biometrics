<script setup>
import { computed, watch, onMounted, ref } from 'vue';
import { db } from '../utils/firebaseInit';
import { auth } from '../utils/firebaseInit';
import { collection, getDocs, doc, updateDoc, getDoc, where, query, deleteDoc } from 'firebase/firestore';
import LayoutHeader from "../components/LayoutHeader.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import TagText from "../components/TagText.vue";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from 'vue-router';

const router = useRouter();
const users = ref([]);
const specialistRequests = ref([]);
const isLoading = ref(true);
const searchQuery = ref("");

// Fetch specialist requests
async function fetchRequests() {
  const q = query(collection(db, "specialistRequests"), where("status", "==", "wait"));
  const specialistRequestsSnapshot = await getDocs(q);
  specialistRequests.value = specialistRequestsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// Fetch all users from Firestore
async function fetchUsers() {
  const querySnapshot = await getDocs(collection(db, "users"));
  users.value = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// Computed property to filter users by partial match for name or email
const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value;
  const lowerCaseQuery = searchQuery.value.toLowerCase();
  return users.value.filter(user =>
      (user.name && user.name.toLowerCase().includes(lowerCaseQuery)) ||
      (user.email && user.email.toLowerCase().includes(lowerCaseQuery))
  );
});

onMounted(() => {
  onAuthStateChanged(auth, async (currentUser) => {
    isLoading.value = true;
    if (!currentUser) {
      await router.push('/');
    } else {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data().role === 'ADMIN') {
        await fetchUsers();
        await fetchRequests();
        isLoading.value = false;
      } else {
        await router.push('/');
      }
    }
  });
});


// Update the role of a user in Firestore
async function updateUserRole(userId, newRole) {
  try {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, { role: newRole });
    const userIndex = users.value.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
      users.value[userIndex].role = newRole; // Update the local state
    }
  } catch (error) {
    console.error("Error updating user role:", error);
  }
}


// Toggle the blocked status of a user in Firestore
async function toggleUserBlockedStatus(userId, isBlocked) {
  try {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, { blocked: !isBlocked });
    const userIndex = users.value.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
      users.value[userIndex].blocked = !isBlocked; // Update the local state
    }
  } catch (error) {
    console.error("Error updating user blocked status:", error);
  }
}

async function approveSpecialistRequest(requestId) {
  try {
    const requestDocRef = doc(db, "specialistRequests", requestId);
    const requestDoc = await getDoc(requestDocRef);
    if (requestDoc.exists()) {
      // Update the user's role to SPECIALIST
      const userDocRef = doc(db, "users", requestId);
      await updateDoc(userDocRef, { role: "SPECIALIST" });

      // Optionally remove the request from specialistRequests collection or update status
      await deleteDoc(requestDocRef);

      // Remove request from the UI
      specialistRequests.value = specialistRequests.value.filter(request => request.id !== requestId);

      // Update user list
      await fetchUsers();
    }
  } catch (error) {
    console.error("Error approving specialist request:", error);
  }
}

async function deniedSpecialistRequest(requestId) {
  try {
    const requestDocRef = doc(db, "specialistRequests", requestId);
    await updateDoc(requestDocRef, { status: "denied" });
    specialistRequests.value = specialistRequests.value.filter(request => request.id !== requestId);
  } catch (error) {
    console.error("Error declining specialist request:", error);
  }
}


watch(searchQuery, async (newQuery) => {
  await fetchUsers(newQuery);
});
</script>


<template>
  <div>
    <LayoutHeader title="Users"/>
    <div class="content w-full">
      <div v-if="isLoading" class="flex justify-center items-center m-20">
        <LoadingSpinner/>
      </div>
      <div v-else class="container w-full">
        <div class="overflow-x-auto mb-8" v-if="specialistRequests.length > 0">
          <h2 class="text-2xl mb-4">Specialist Requests</h2>
          <table class="min-w-full bg-white border border-gray-300">
            <thead>
            <tr class="bg-gray-100">
              <th class="text-left p-4 border-b border-gray-300 font-semibold">Full name</th>
              <th class="text-left p-4 border-b border-gray-300 font-semibold">Email</th>
              <th class="text-left p-4 border-b border-gray-300 font-semibold">Comment</th>
              <th class="text-left p-4 border-b border-gray-300 font-semibold w-2"></th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="request in specialistRequests" :key="request.id">
              <td class="p-4 border-b border-gray-300">{{ request.name }}</td>
              <td class="p-4 border-b border-gray-300">{{ request.email }}</td>
              <td class="p-4 border-b border-gray-300">{{ request.comment }}</td>
              <td class="p-4 border-b border-gray-300 flex gap-3">
                <button
                    @click="deniedSpecialistRequest(request.id)"
                    class="secondary bg-red-500 hover:bg-red-600 ml-2"
                >
                  Decline
                </button>
                <button
                    @click="approveSpecialistRequest(request.id)"
                    class="secondary bg-green-500 hover:bg-green-600"
                >
                  Approve
                </button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
        <div class="overflow-x-auto">
          <div class="flex justify-between">
            <h2 class="text-2xl mb-4">All users <span class="text-slate-400 font-light">({{filteredUsers.length}})</span></h2>
            <div class="flex gap-5 items-center mb-3">
              Search
              <input
                  v-model="searchQuery"
                  placeholder="Search by name or email"
                  class="py-1 px-2 border border-gray-300 rounded"
              />
            </div>
          </div>
          <table class="min-w-full bg-white border border-gray-300">
            <thead>
            <tr class="bg-gray-100">
              <th class="text-left p-4 border-b border-gray-300 font-semibold">Full name</th>
              <th class="text-left p-4 border-b border-gray-300 font-semibold">Email</th>
              <th class="text-left p-4 border-b border-gray-300 font-semibold">Role</th>
              <th class="text-left p-4 border-b border-gray-300 font-semibold w-2">Actions</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="user in filteredUsers" :key="user.id" :class="[user.blocked ? 'bg-red-100' : '']">
              <td class="p-4 border-b border-gray-300">
                <TagText text="Blocked" color="error" v-if="user.blocked" class="mr-2" />
                {{ user.name }}
              </td>
              <td class="p-4 border-b border-gray-300">{{ user.email }}</td>
              <td class="p-4 border-b border-gray-300">
                <select
                    v-model="user.role"
                    @change="updateUserRole(user.id, user.role)"
                    class="p-2 border rounded"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="BREEDER">Breeder</option>
                  <option value="SPECIALIST">Specialist</option>
                </select>
              </td>
              <td class="p-4 border-b border-gray-300">
                <button
                    @click="toggleUserBlockedStatus(user.id, user.blocked)"
                    class="secondary"
                    :class="user.blocked ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'"
                >
                  {{ user.blocked ? 'Unblock' : 'Block' }}
                </button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
table {
  td {
    @apply border-0 align-baseline;
  }
  button {
    @apply w-28 bg-white border-slate-400 text-black ;
  }
}
</style>
