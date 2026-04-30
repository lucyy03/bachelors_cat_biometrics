<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { db } from '../utils/firebaseInit';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../utils/useAuth';
import { useRouter } from 'vue-router';

const props = defineProps<{
	id: string;
}>();

const cat = ref<any | null>(null);
const author = ref<any | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

// user role handling
type UserRole = 'BREEDER' | 'USER' | null | string;
const currentUserRole = ref<UserRole>(null);
const isBreeder = computed(() => currentUserRole.value === 'BREEDER');

const { user } = useAuth();
const router = useRouter();
const currentUserId = computed(() => user.value?.uid || null);

const hasExistingRating = ref(false);

const formattedAverageScore = computed(() => {
	if (!cat.value) return '0.00';
	return Number(cat.value.averageScore ?? 0).toFixed(2);
});

const isAuthorVerified = computed(() => author.value?.isVerifiedBreeder === true);

async function fetchCat(id: string) {
	isLoading.value = true;
	error.value = null;
	cat.value = null;
	author.value = null;

	try {
		//note:load the single cat document by id
		const refDoc = doc(db, 'cats', id);
		const snap = await getDoc(refDoc);

		if (snap.exists()) {
			const catData = {
				id: snap.id,
				...snap.data()
			} as any;
			cat.value = catData;

			if (catData.addedById) {
				const authorSnap = await getDoc(doc(db, 'users', catData.addedById));
				if (authorSnap.exists()) {
					author.value = authorSnap.data();
				}
			}
		} else {
			error.value = 'Cat not found';
		}
	} catch (e: any) {
		console.error('failed to load cat', e);
		error.value = 'Error loading cat details';
	} finally {
		isLoading.value = false;
	}
}

async function fetchCurrentUserRole() {
	const firebaseUser = user.value;
	if (!firebaseUser) {
		currentUserRole.value = null;
		return;
	}

	try {
		//note:load the role from users/{uid} doc
		const userDocRef = doc(db, 'users', firebaseUser.uid);
		const snap = await getDoc(userDocRef);
		if (snap.exists()) {
			const data = snap.data() as any;
			currentUserRole.value = data.role ?? null;
			console.log('[cat-info] loaded user role:', currentUserRole.value);
		} else {
			currentUserRole.value = null;
		}
	} catch (e) {
		console.error('failed to load user role', e);
		currentUserRole.value = null;
	}
}

async function fetchExistingRatingForCat() {
	const uid = currentUserId.value;
	if (!uid || !cat.value) {
		hasExistingRating.value = false;
		return;
	}
	const ratingId = `${cat.value.id}_${uid}`;
	const ratingRef = doc(db, 'ratings', ratingId);
	const snap = await getDoc(ratingRef);
	hasExistingRating.value = snap.exists();
}

function onRateClick() {
	if (!cat.value) return;
	router.push(`/cat/${cat.value.id}/rate`);
}

//note:refetch cat whenever the id prop changes (and also on first render)
watch(
	() => props.id,
	(newId) => {
		if (newId) {
			fetchCat(newId);
		}
	},
	{ immediate: true }
);

//note:load user role whenever auth user changes
watch(
	user,
	() => {
		fetchCurrentUserRole();
	},
	{ immediate: true }
);

//note:check for existing rating when cat or user changes
watch(
	[() => cat.value, currentUserId],
	() => {
		if (cat.value && currentUserId.value) {
			fetchExistingRatingForCat();
		}
	}
);
</script>

<template>
	<div class="cat-detail-wrapper">
		<div v-if="isLoading" class="flex justify-center items-center m-10">
			Loading cat details...
		</div>

		<div v-else-if="error" class="text-red-600">
			{{ error }}
		</div>

		<div v-else-if="cat" class="cat-detail flex flex-col md:flex-row gap-8">
			<!-- left: image + author -->
			<div class="cat-photo max-w-md">
				<img
					v-if="cat.imageUrl"
					:src="cat.imageUrl"
					:alt="cat.name || 'Cat photo'"
					class="w-full h-auto rounded-md shadow-md"
				/>
				<div v-else class="w-64 h-64 flex items-center justify-center bg-gray-200 rounded">
					No photo
				</div>

				<!-- author line goes right here -->
				<p
					v-if="cat.addedByName || cat.addedByEmail || cat.addedBy"
					class="author mt-3"
				>
					Author:
					<span class="author-name">
						{{ cat.addedByName || cat.addedByEmail || cat.addedBy || 'Unknown' }}
					</span>
					<span v-if="isAuthorVerified" class="verified-badge">Verified breeder</span>
				</p>
			</div>

			<!-- right: info -->
			<div class="cat-info space-y-2">
				<h1 class="text-2xl font-semibold">
					{{ cat.name || 'Unnamed cat' }}
				</h1>

				<p><strong>Breed:</strong> {{ cat.breed }}</p>
				<p v-if="cat.age != null"><strong>Age on photo:</strong> {{ cat.age }}</p>
				<p v-if="cat.baseColor"><strong>Base color:</strong> {{ cat.baseColor }}</p>
				<p v-if="cat.coatPattern && cat.coatPattern !== 'none'">
					<strong>Coat pattern:</strong> {{ cat.coatPattern }}
					<span v-if="cat.coatPatternColor">({{ cat.coatPatternColor }})</span>
				</p>
				<p v-if="cat.gender"><strong>Gender:</strong> {{ cat.gender }}</p>
				<p v-if="cat.origin"><strong>Country of origin/registration:</strong> {{ cat.origin }}</p>

				<p>
					<strong>Average score:</strong> {{ formattedAverageScore }} / 10 ({{ cat.reviewCount }} reviews)
				</p>

				<p v-if="cat.comment"><strong>Comment:</strong> {{ cat.comment }}</p>

				<!-- breeder-only action -->
				<button
					v-if="isBreeder"
					type="button"
					class="rate-btn"
					@click="onRateClick"
				>
					{{ hasExistingRating ? 'Update cat rating' : 'Rate' }}
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.cat-detail-wrapper {
	width: 100%;
}

.cat-detail {
	max-width: 900px;
	margin: 0 auto;
}

.rate-btn {
	margin-top: 1.5rem;
	padding: 0.6rem 1.4rem;
	border-radius: 9999px;
	border: none;
	background: #b58ad7;
	color: #fff;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.15s ease, transform 0.08s ease;
}

.rate-btn:hover {
	background: #a172cc;
	transform: translateY(-1px);
}

.author {
	font-size: 0.9rem;
	color: #4b5563;
	text-align: center;
}

.author-name {
	font-weight: 600;
}

.verified-badge {
	display: inline-flex;
	align-items: center;
	margin-left: 0.35rem;
	padding: 0.1rem 0.45rem;
	border-radius: 9999px;
	background: #dcfce7;
	color: #166534;
	font-size: 0.72rem;
	font-weight: 700;
}
</style>
