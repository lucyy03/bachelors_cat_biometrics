<script setup>
import { onMounted, ref, watchEffect } from 'vue';
import { db } from '../utils/firebaseInit';
import {
	collection,
	getDocs,
	getDoc,
	doc,
	query,
	where
} from 'firebase/firestore';
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
	if (status === 'approved') {
		return 'Approved for specialist';
	} else if (status === 'denied') {
		return 'Denied for specialist';
	}
	return 'Waiting for approval to specialist';
};

async function fetchCats() {
	if (!user.value) {
		console.log('User is not logged in, skipping fetchCats');
		cats.value = [];
		isLoading.value = false;
		return;
	}

	isLoading.value = true;

	try {
		//note:find all ratings created by this user
		const ratingsQ = query(
			collection(db, 'ratings'),
			where('userId', '==', user.value.uid)
		);
		const ratingsSnap = await getDocs(ratingsQ);

		if (ratingsSnap.empty) {
			cats.value = [];
			return;
		}

		//note:collect unique cat ids from ratings
		const catIdSet = new Set();
		ratingsSnap.forEach(r => {
			const data = r.data();
			if (data.catId) catIdSet.add(data.catId);
		});

		const catIds = Array.from(catIdSet);

		//note:load each cat document
		const catPromises = catIds.map(catId => {
			const catDocRef = doc(db, 'cats', catId);
			return getDoc(catDocRef);
		});

		const catDocs = await Promise.all(catPromises);

		cats.value = catDocs
			.filter(catDoc => catDoc.exists())
			.map(catDoc => ({
				id: catDoc.id,
				...catDoc.data()
			}));
	} catch (error) {
		console.error('Error fetching cats: ', error);
	} finally {
		isLoading.value = false;
	}
}

onMounted(() => {
	fetchCats();
});

watchEffect(async () => {
	if (user.value) {
		//note:refresh reviewed cats when user changes
		await fetchCats();

		role.value = await getUserRole();

		if (role.value === 'BREEDER') {
			const specialistRequestDoc = await getDoc(
				doc(db, 'specialistRequests', user.value.uid)
			);
			specialistRequestsStatus.value = specialistRequestDoc.exists()
				? specialistRequestDoc.data().status
				: null;
			console.log(specialistRequestsStatus.value);
		}
	}
});
</script>

<template>
	<div>
		<LayoutHeader title="About you" />
		<div class="content w-full">
			<div v-if="isLoading" class="flex justify-center items-center m-20">
				<LoadingSpinner />
			</div>

			<div class="container" v-else>
				<h2>Profile</h2>

				<div
					class="pb-5 flex w-fit flex-col rounded-xl bg-slate-200 p-5 gap-5"
					v-if="user"
				>
					<div class="text-2xl">
						<strong>{{ user?.displayName }}</strong>
						<span class="text-slate-500">({{ user?.email }})</span>
					</div>

					<TagText
						:color="specialistRequestsStatus === 'denied' ? 'error' : 'warning'"
						v-if="role === 'BREEDER' && specialistRequestsStatus"
						:text="getRequestStatusText(specialistRequestsStatus)"
						class="w-fit"
					/>
					<TagText
						v-else
						:text="role"
						class="w-fit lowercase first-letter:uppercase"
					/>

					<router-link
						to="/specialist-form"
						v-if="
							role === 'BREEDER' &&
							(!specialistRequestsStatus || specialistRequestsStatus === 'denied')
						"
					>
						<button class="secondary bg-white">
							Sign up to specialist
						</button>
					</router-link>
				</div>

				<h2>Reviewed cats</h2>

				<div class="flex gap-10 flex-wrap">
					<template v-if="cats.length > 0">
						<div
							v-for="cat in cats"
							:key="cat.id"
							class="reviewed-card"
						>
							<CatPreview
								:id="cat.id"
								:name="cat.name"
								:breed="cat.breed"
								:age="cat.age"
								:averageScore="cat.averageScore"
								:reviewCount="cat.reviewCount"
								:imageSrc="cat.imageUrl"
							/>
							<p class="uploader">
                Uploaded by: {{ cat.addedByName || cat.addedBy || 'Unknown' }}
              </p>
						</div>
					</template>

					<MessageBanner
						v-else
						class="w-full"
						message="You haven't reviewed any cats yet"
						:visibleClose="false"
					/>
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
	@apply text-3xl mb-3 mt-6;
}

.reviewed-card {
	display: flex;
	flex-direction: column;
	gap: 0.3rem;
}

.uploader {
	font-size: 0.85rem;
	color: #64748b;
}
</style>