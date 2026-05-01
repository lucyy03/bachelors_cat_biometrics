<script setup>
import { computed, onMounted, ref, watchEffect } from 'vue';
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

const reviewedCats = ref([]);
const myCats = ref([]);
const isLoading = ref(true);
const role = ref(null);
const specialistRequestsStatus = ref(null);
const profileData = ref(null);

const formattedRatingAccuracy = computed(() => {
	const value = profileData.value?.ratingAccuracyOverall;
	if (value == null) return '-';
	return `${Number(value).toFixed(2)}%`;
});

const formattedRatingPoints = computed(() => {
	const value = profileData.value?.ratingPoints;
	if (value == null) return '0.00';
	return Number(value).toFixed(2);
});

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
		reviewedCats.value = [];
		myCats.value = [];
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

		reviewedCats.value = catDocs
			.filter(catDoc => catDoc.exists())
			.map(catDoc => ({
				id: catDoc.id,
				...catDoc.data()
			}));

		const myCatsQ = query(
			collection(db, 'cats'),
			where('addedById', '==', user.value.uid)
		);
		const myCatsSnap = await getDocs(myCatsQ);
		myCats.value = myCatsSnap.docs.map(catDoc => ({
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

		const profileSnap = await getDoc(doc(db, 'users', user.value.uid));
		profileData.value = profileSnap.exists() ? profileSnap.data() : null;

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

				<div class="profile-overview">
					<div class="profile-card" v-if="user">
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

						<TagText
							v-if="profileData?.isVerifiedBreeder"
							text="Verified breeder"
							color="success"
							class="w-fit"
						/>

						<div v-if="role === 'BREEDER'" class="rating-stats">
							<div>
								<span class="stat-label">Rating accuracy</span>
								<strong>{{ formattedRatingAccuracy }}</strong>
							</div>
							<div>
								<span class="stat-label">Rating points</span>
								<strong>{{ formattedRatingPoints }}</strong>
							</div>
						</div>

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

					<section class="my-cats-panel">
						<div class="panel-head">
							<div>
								<h3>My cats</h3>
								<span>{{ myCats.length }} uploaded</span>
							</div>
						</div>

						<div class="my-cats-box">
							<template v-if="myCats.length > 0">
								<router-link
									v-for="cat in myCats"
									:key="cat.id"
									:to="`/cat/${cat.id}`"
									class="mini-cat"
								>
									<div class="mini-cat-image">
										<img
											:src="cat.imageUrl"
											:alt="cat.name || 'Cat photo'"
											:style="{
												objectPosition: `${Number(cat.imagePosX ?? 50)}% ${Number(cat.imagePosY ?? 50)}%`,
												transform: `scale(${Number(cat.imageScale ?? 1)})`,
												transformOrigin: `${Number(cat.imagePosX ?? 50)}% ${Number(cat.imagePosY ?? 50)}%`
											}"
										/>
									</div>
									<div class="mini-cat-info">
										<strong>{{ cat.name || 'Unnamed cat' }}</strong>
										<span>{{ cat.reviewCount || 0 }} reviews</span>
										<span>avg {{ Number(cat.averageScore ?? 0).toFixed(2) }} / 10</span>
									</div>
								</router-link>
							</template>

							<MessageBanner
								v-else
								class="w-full"
								message="You haven't uploaded any cats yet"
								:visibleClose="false"
							/>
						</div>
					</section>
				</div>

				<h2>Reviewed cats</h2>

				<!-- changed: use grid instead of a plain flex row -->
				<div class="cat-grid">
					<template v-if="reviewedCats.length > 0">
						<div
							v-for="cat in reviewedCats"
							:key="cat.id"
							class="profile-cat-card"
						>
							<CatPreview
								:id="cat.id"
								:name="cat.name"
								:breed="cat.breed"
								:age="cat.age"
								:averageScore="cat.averageScore"
								:reviewCount="cat.reviewCount"
								:imageSrc="cat.imageUrl"
								:imagePosX="cat.imagePosX"
								:imagePosY="cat.imagePosY"
								:imageScale="cat.imageScale"
							/>
							<p class="uploader">
								Uploaded by: {{ cat.addedBy || 'Unknown' }}
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

				<template v-if="false">
					<h2>My cats</h2>

					<div class="cat-grid">
						<template v-if="myCats.length > 0">
							<div
								v-for="cat in myCats"
								:key="cat.id"
								class="profile-cat-card"
							>
								<CatPreview
									:id="cat.id"
									:name="cat.name"
									:breed="cat.breed"
									:age="cat.age"
									:averageScore="cat.averageScore"
									:reviewCount="cat.reviewCount"
									:imageSrc="cat.imageUrl"
									:imagePosX="cat.imagePosX"
									:imagePosY="cat.imagePosY"
									:imageScale="cat.imageScale"
								/>
								<p class="uploader">
									{{ cat.reviewCount || 0 }} reviews · average {{ Number(cat.averageScore ?? 0).toFixed(2) }} / 10
								</p>
							</div>
						</template>

						<MessageBanner
							v-else
							class="w-full"
							message="You haven't uploaded any cats yet"
							:visibleClose="false"
						/>
					</div>
				</template>
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

.profile-overview {
	display: grid;
	grid-template-columns: minmax(320px, 390px) minmax(360px, 1fr);
	gap: 1.5rem;
	align-items: stretch;
}

.profile-card,
.my-cats-panel {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
	padding: 1.25rem;
	border-radius: 0.75rem;
	background: #e2e8f0;
}

.my-cats-panel {
	min-height: 260px;
}

.panel-head {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 1rem;
}

.panel-head > div {
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
}

.panel-head h3 {
	font-size: 1.55rem;
	font-weight: 700;
}

.panel-head span {
	color: #64748b;
	font-size: 0.95rem;
}

.my-cats-box {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
	gap: 0.9rem;
	max-height: 360px;
	overflow: auto;
	padding-right: 0.25rem;
}

.mini-cat {
	display: grid;
	grid-template-columns: 82px 1fr;
	gap: 0.75rem;
	align-items: center;
	padding: 0.65rem;
	border-radius: 0.75rem;
	background: #fff;
	box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.mini-cat:hover {
	transform: translateY(-1px);
}

.mini-cat-image {
	width: 82px;
	height: 72px;
	border-radius: 0.55rem;
	overflow: hidden;
	background: #cbd5e1;
}

.mini-cat-image img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

.mini-cat-info {
	display: flex;
	flex-direction: column;
	min-width: 0;
	line-height: 1.25;
}

.mini-cat-info strong {
	font-size: 1rem;
	overflow-wrap: anywhere;
}

.mini-cat-info span {
	color: #64748b;
	font-size: 0.85rem;
}

.cat-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	gap: 1.5rem;
	align-items: flex-start;
}

.profile-cat-card {
	display: flex;
	flex-direction: column;
	gap: 0.55rem;
	min-width: 0;
}

.profile-cat-card :deep(.cat-preview) {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: 0;
	overflow: hidden;
	border-radius: 10px;
}

.profile-cat-card :deep(.cat-preview:hover) {
	transform: translateY(-2px);
}

.profile-cat-card :deep(.image-container) {
	width: 100%;
	min-width: 0;
	height: 210px;
	flex: none;
}

.profile-cat-card :deep(.image-container img) {
	width: 100%;
	height: 100%;
	border-radius: 10px 10px 0 0;
	object-fit: cover;
}

.profile-cat-card :deep(.information) {
	width: 100%;
	padding: 0.9rem 1rem 1rem;
	gap: 0.55rem;
}

.profile-cat-card :deep(.information .title) {
	font-size: 1.45rem;
	line-height: 1.2;
	overflow-wrap: anywhere;
}

.profile-cat-card :deep(.information table) {
	font-size: 1rem;
	line-height: 1.35;
}

.profile-cat-card :deep(.information table tr td:first-child) {
	width: 4.5rem;
}

.profile-cat-card :deep(.score) {
	align-self: flex-start;
	font-size: 1.65rem;
	padding-bottom: 0;
	margin-top: 0.35rem;
	flex: none;
}

.profile-cat-card :deep(.score span:first-child) {
	font-size: 0.9rem;
}

.profile-cat-card :deep(.information button) {
	width: 100%;
	margin-top: 0.55rem;
}

.profile-cat-card :deep(.cat-preview + *) {
	margin-top: 0;
}

.uploader {
	font-size: 0.85rem;
	color: #64748b;
	padding: 0 0.2rem;
	overflow-wrap: anywhere;
}

.rating-stats {
	display: grid;
	grid-template-columns: repeat(2, minmax(120px, 1fr));
	gap: 0.75rem;
}

.rating-stats > div {
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
	padding: 0.65rem 0.75rem;
	border-radius: 0.75rem;
	background: #fff;
}

.stat-label {
	font-size: 0.78rem;
	color: #64748b;
}

@media (max-width: 900px) {
	.profile-overview {
		grid-template-columns: 1fr;
	}
}
</style>
