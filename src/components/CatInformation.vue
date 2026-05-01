<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { db } from '../utils/firebaseInit';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../utils/useAuth';
import { useRoute, useRouter } from 'vue-router';

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
const route = useRoute();
const router = useRouter();
const currentUserId = computed(() => user.value?.uid || null);

const hasExistingRating = ref(false);
const isOwnCat = computed(() => !!cat.value?.addedById && cat.value.addedById === currentUserId.value);

const formattedAverageScore = computed(() => {
	if (!cat.value) return '0.00';
	return Number(cat.value.averageScore ?? 0).toFixed(2);
});

const isAuthorVerified = computed(() => author.value?.isVerifiedBreeder === true);

const ratingFeedback = computed(() => {
	if (route.query.ratingStatus === 'submitted') {
		return 'Your rating was submitted successfully.';
	}

	if (route.query.ratingStatus === 'updated') {
		return 'Your rating was updated successfully.';
	}

	return null;
});

const catDetails = computed(() => {
	if (!cat.value) return [];

	return [
		{ label: 'Breed', value: cat.value.breed },
		{ label: 'Age on photo', value: cat.value.age != null ? cat.value.age : null },
		{ label: 'Base color', value: cat.value.baseColor },
		{
			label: 'Coat pattern',
			value: cat.value.coatPattern && cat.value.coatPattern !== 'none'
				? `${cat.value.coatPattern}${cat.value.coatPatternColor ? ` (${cat.value.coatPatternColor})` : ''}`
				: null
		},
		{ label: 'Gender', value: cat.value.gender },
		{ label: 'Origin', value: cat.value.origin }
	].filter((item) => item.value !== null && item.value !== undefined && item.value !== '');
});

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
				try {
					const authorSnap = await getDoc(doc(db, 'users', catData.addedById));
					if (authorSnap.exists()) {
						author.value = authorSnap.data();
					}
				} catch (authorError) {
					console.warn('failed to load cat author details', authorError);
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
			<div v-if="ratingFeedback" class="rating-feedback">
				{{ ratingFeedback }}
			</div>

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
			<div class="cat-info">
				<div class="cat-info-head">
					<h1>{{ cat.name || 'Unnamed cat' }}</h1>
					<span class="breed-pill">{{ cat.breed || 'Unknown breed' }}</span>
				</div>

				<div class="detail-grid">
					<div
						v-for="item in catDetails"
						:key="item.label"
						class="detail-card"
					>
						<span>{{ item.label }}</span>
						<strong>{{ item.value }}</strong>
					</div>
				</div>

				<div class="score-card">
					<div>
						<span>Average score</span>
						<strong>{{ formattedAverageScore }} / 10</strong>
					</div>
					<small>{{ cat.reviewCount || 0 }} {{ (cat.reviewCount || 0) === 1 ? 'review' : 'reviews' }}</small>
				</div>

				<p v-if="cat.comment" class="comment-box">
					<span>Comment</span>
					{{ cat.comment }}
				</p>

				<!-- breeder-only action -->
				<p v-if="isBreeder && isOwnCat" class="own-cat-note">
					You uploaded this cat, so you cannot rate it.
				</p>

				<button
					v-else-if="isBreeder"
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
	max-width: 980px;
	margin: 0 auto;
	flex-wrap: wrap;
	align-items: flex-start;
}

.rating-feedback {
	width: 100%;
	padding: 0.85rem 1rem;
	border-radius: 10px;
	background: #ecfdf5;
	border: 1px solid #86efac;
	color: #166534;
	font-weight: 700;
	box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.rate-btn {
	width: 100%;
	margin-top: 0.5rem;
	padding: 0.75rem 1.4rem;
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

.own-cat-note {
	margin-top: 0.5rem;
	padding: 0.75rem 1rem;
	border-radius: 0.75rem;
	background: #fff7ed;
	color: #7c2d12;
	font-weight: 600;
}

.cat-info {
	flex: 1;
	min-width: 320px;
	display: flex;
	flex-direction: column;
	gap: 1rem;
	padding: 1.25rem;
	border-radius: 1rem;
	background: #ffffff;
	box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
	border: 1px solid #ede9fe;
}

.cat-info-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	flex-wrap: wrap;
}

.cat-info-head h1 {
	font-size: 2rem;
	font-weight: 800;
	line-height: 1.1;
}

.breed-pill {
	padding: 0.25rem 0.65rem;
	border-radius: 9999px;
	background: #f3e8ff;
	color: #7e22ce;
	font-weight: 700;
	font-size: 0.85rem;
}

.detail-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.75rem;
}

.detail-card {
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
	padding: 0.75rem;
	border-radius: 0.75rem;
	background: #f8fafc;
	border: 1px solid #e2e8f0;
}

.detail-card span,
.score-card span,
.comment-box span {
	color: #64748b;
	font-size: 0.78rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.detail-card strong {
	font-size: 1rem;
	color: #111827;
	overflow-wrap: anywhere;
}

.score-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 1rem;
	border-radius: 0.9rem;
	background: linear-gradient(135deg, #faf5ff, #eef2ff);
	border: 1px solid #ddd6fe;
}

.score-card div {
	display: flex;
	flex-direction: column;
	gap: 0.1rem;
}

.score-card strong {
	font-size: 1.6rem;
	color: #581c87;
	line-height: 1;
}

.score-card small {
	color: #64748b;
	font-weight: 700;
	white-space: nowrap;
}

.comment-box {
	display: flex;
	flex-direction: column;
	gap: 0.35rem;
	padding: 0.9rem;
	border-radius: 0.75rem;
	background: #f8fafc;
	color: #334155;
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

@media (max-width: 720px) {
	.detail-grid {
		grid-template-columns: 1fr;
	}

	.score-card {
		align-items: flex-start;
		flex-direction: column;
	}
}
</style>
