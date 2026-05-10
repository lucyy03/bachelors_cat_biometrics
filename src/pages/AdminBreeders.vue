<script setup lang="ts">
import {ref, onMounted} from 'vue';
import {
	collection,
	getDocs,
	query,
	where,
	doc,
	getDoc,
	updateDoc
} from 'firebase/firestore';
import {db} from '../utils/firebaseInit';
import CatPreview from '../components/CatPreview.vue';

interface Breeder {
	id: string;
	username: string;
	email?: string;
	ratingCount: number;
	ratingAccuracyOverall?: number;
	ratingPoints?: number;
	isVerifiedBreeder?: boolean;
	isInactiveBreeder?: boolean;
}

interface RatedCat {
	id: string;
	name?: string;
	breed?: string;
	age?: number;
	averageScore?: number;
	reviewCount?: number;
	imageUrl?: string;
	imagePosX?: number;
	imagePosY?: number;
	imageScale?: number;

	//new
	ratingId: string;
	ratingValues: Record<string, number>;
	overallScore?: number;
}

const breeders = ref<Breeder[]>([]);
const loading = ref(true);
const errorMsg = ref<string | null>(null);
const INACTIVE_AFTER_DAYS = 90;
const INACTIVE_AFTER_MS = INACTIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;

//selected breeder and their rated cats
const selectedBreeder = ref<Breeder | null>(null);
const ratedCats = ref<RatedCat[]>([]);
const loadingRatedCats = ref(false);

onMounted(async () => {
	try {
		const q = query(
			collection(db, 'users'),
			where('role', '==', 'BREEDER'),
			where('certificateStatus', '==', 'ACCEPTED')
		);
		const snap = await getDocs(q);

		const list: Breeder[] = [];
		snap.forEach((docSnap) => {
			const data = docSnap.data() as any;

			list.push({
				id: docSnap.id,
				username: data.username || 'unknown user',
				email: data.email,
				ratingCount: 0,
				ratingAccuracyOverall: data.ratingAccuracyOverall,
				ratingPoints: data.ratingPoints,
				isVerifiedBreeder: data.isVerifiedBreeder === true,
				isInactiveBreeder: data.isInactiveBreeder === true
			});
		});

		//note:for each breeder, count ratings and mark stale breeders inactive
		await Promise.all(
			list.map(async (b) => {
				const ratingsQ = query(
					collection(db, 'ratings'),
					where('userId', '==', b.id)
				);
				const ratingsSnap = await getDocs(ratingsQ);
				b.ratingCount = ratingsSnap.size;

				let latestRatingAtMs = 0;
				ratingsSnap.forEach((r) => {
					const data = r.data() as any;
					const ts = data.updatedAt || data.createdAt;
					const date = ts?.toDate ? ts.toDate() : null;
					if (date) {
						latestRatingAtMs = Math.max(latestRatingAtMs, date.getTime());
					}
				});

				const isInactive = !latestRatingAtMs || Date.now() - latestRatingAtMs >= INACTIVE_AFTER_MS;

				if (isInactive) {
					b.isVerifiedBreeder = false;
					b.isInactiveBreeder = true;
					await updateDoc(doc(db, 'users', b.id), {
						isInactiveBreeder: true,
						isVerifiedBreeder: false
					});
				} else {
					b.isInactiveBreeder = false;
					await updateDoc(doc(db, 'users', b.id), {
						isInactiveBreeder: false
					});
				}
			})
		);

		breeders.value = list;
	} catch (e) {
		errorMsg.value = 'Failed to load breeders.';
	} finally {
		loading.value = false;
	}
});

async function loadRatedCatsForBreeder(breeder: Breeder) {
	selectedBreeder.value = breeder;
	loadingRatedCats.value = true;
	ratedCats.value = [];

	try {
		//note:find all ratings from this breeder
		const ratingsQ = query(
			collection(db, 'ratings'),
			where('userId', '==', breeder.id)
		);
		const ratingsSnap = await getDocs(ratingsQ);

		if (ratingsSnap.empty) {
			return;
		}

		//note:map catId -> rating meta (id, score, values)
		const ratingByCatId = new Map<
			string,
			{ ratingId: string; overallScore?: number; values: any }
		>();

		ratingsSnap.forEach((r) => {
			const data = r.data() as any;
			if (data.catId) {
				ratingByCatId.set(data.catId, {
					ratingId: r.id,
					overallScore: data.overallScore,
					values: data.values || {}
				});
			}
		});

		const catIds = Array.from(ratingByCatId.keys());

		const catPromises = catIds.map((catId) => {
			const catDocRef = doc(db, 'cats', catId);
			return getDoc(catDocRef);
		});

		const catDocs = await Promise.all(catPromises);

		ratedCats.value = catDocs
			.filter((c) => c.exists())
			.map((c) => {
				const catData = c.data() as any;
				const ratingMeta = ratingByCatId.get(c.id);

				return {
					id: c.id,
					...catData,
					ratingId: ratingMeta?.ratingId || '',
					ratingValues: ratingMeta?.values || {},
					overallScore: ratingMeta?.overallScore
				} as RatedCat;
			});
	} catch (e) {
		console.error('error loading rated cats', e);
	} finally {
		loadingRatedCats.value = false;
	}
}

function handleBreederClick(breeder: Breeder) {
	loadRatedCatsForBreeder(breeder);
}

function formatPercent(value?: number) {
	if (value == null) return '-';
	return `${Number(value).toFixed(2)}%`;
}

function formatPoints(value?: number) {
	if (value == null) return '0.00';
	return Number(value).toFixed(2);
}
</script>

<template>
	<section class="p-8 text-slate-100">
		<h1 class="text-2xl mb-4">Breeders</h1>

		<p v-if="loading">Loading breeders...</p>
		<p v-else-if="errorMsg">{{ errorMsg }}</p>

		<div v-else class="breeder-grid">
			<div
				v-for="b in breeders"
				:key="b.id"
				class="breeder-pill"
				:class="{ active: selectedBreeder && selectedBreeder.id === b.id }"
				@click="handleBreederClick(b)"
			>
				<div class="breeder-main">
					<span class="breeder-name">
						{{ b.username }}
						<span v-if="b.isVerifiedBreeder" class="verified-badge">Verified</span>
						<span v-if="b.isInactiveBreeder" class="inactive-badge">Inactive</span>
					</span>
					<span class="breeder-email">
						{{ b.email || 'no email' }}
					</span>
					<span class="breeder-stats">
						Accuracy: {{ formatPercent(b.ratingAccuracyOverall) }} &middot; Points: {{ formatPoints(b.ratingPoints) }}
					</span>
				</div>
				<div class="breeder-count">
					{{ b.ratingCount }} cats rated
				</div>
			</div>
		</div>

		<!-- rated cats of selected breeder -->
		<div v-if="selectedBreeder" class="rated-section">
			<h2 class="text-xl mb-3">
				Cats rated by {{ selectedBreeder.username }}
			</h2>

			<div v-if="loadingRatedCats">Loading rated cats...</div>

			<div v-else>
				<div v-if="ratedCats.length > 0" class="rated-grid">
					<div
						v-for="cat in ratedCats"
						:key="cat.id"
						class="rated-card"
					>
						<CatPreview
							:id="cat.id"
							:name="cat.name || 'Unnamed cat'"
							:breed="cat.breed || 'unknown'"
							:age="cat.age ?? 0"
							:averageScore="cat.averageScore ?? 0"
							:reviewCount="cat.reviewCount ?? 0"
							:imageSrc="cat.imageUrl || ''"
							:imagePosX="cat.imagePosX ?? 50"
							:imagePosY="cat.imagePosY ?? 50"
							:imageScale="cat.imageScale ?? 1"
							:adminRatingDetail="true"
							:ratingId="cat.ratingId"
						/>
					</div>
				</div>

				<p v-else class="mt-2 text-slate-300">
					This breeder has not rated any cats yet.
				</p>
			</div>
		</div>
	</section>
</template>

<style scoped lang="scss">
.breeder-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 1rem;
}

.breeder-pill {
	@apply bg-slate-800 text-slate-100;
	border-radius: 9999px;
	padding: 0.6rem 1.2rem;
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 0.75rem;
	cursor: pointer;
	transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.1s ease;
}

.breeder-pill:hover {
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(15, 23, 42, 0.5);
}

.breeder-pill.active {
	background-color: #0f172a;
	box-shadow: 0 4px 14px rgba(15, 23, 42, 0.7);
}

.breeder-main {
	display: flex;
	flex-direction: column;
}

.breeder-name {
	font-weight: 600;
}

.verified-badge {
	margin-left: 0.35rem;
	padding: 0.08rem 0.4rem;
	border-radius: 9999px;
	background: #dcfce7;
	color: #166534;
	font-size: 0.7rem;
	font-weight: 800;
}

.inactive-badge {
	margin-left: 0.35rem;
	padding: 0.08rem 0.4rem;
	border-radius: 9999px;
	background: #fee2e2;
	color: #991b1b;
	font-size: 0.7rem;
	font-weight: 800;
}

.breeder-email {
	font-size: 0.8rem;
	color: #cbd5f5;
}

.breeder-stats {
	font-size: 0.75rem;
	color: #e2e8f0;
}

.breeder-count {
	font-size: 0.85rem;
	padding: 0.2rem 0.6rem;
	border-radius: 9999px;
	background: rgba(148, 163, 184, 0.3);
}

/* rated cats section */
.rated-section {
	margin-top: 2.5rem;
	max-width: 100%;
}

.rated-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 1.25rem;
	align-items: stretch;
}

.rated-card {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.rated-card :deep(.cat-preview) {
	width: 100%;
	height: 100%;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 0;
	overflow: hidden;
	color: #1f2937;
	text-decoration: none;
	background: rgba(255, 255, 255, 0.94);
	border-radius: 8px;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
}

.rated-card :deep(.cat-preview:hover) {
	transform: translateY(-2px);
}

.rated-card :deep(.image-container) {
	width: 100%;
	min-width: 0;
	height: auto;
	aspect-ratio: 4 / 3;
	flex: none;
	background: #e2d8eb;
}

.rated-card :deep(.image-container img) {
	width: 100%;
	height: 100%;
	border-radius: 8px 8px 0 0;
}

.rated-card :deep(.information) {
	width: 100%;
	min-width: 0;
	flex: 1;
	gap: 0.65rem;
	padding: 1rem;
}

.rated-card :deep(.information .title) {
	font-size: 1.35rem;
	line-height: 1.2;
	overflow-wrap: anywhere;
}

.rated-card :deep(.information table) {
	width: 100%;
	table-layout: fixed;
	font-size: 0.95rem;
}

.rated-card :deep(.information table tr td:first-child) {
	width: 48%;
}

.rated-card :deep(.information table td) {
	overflow-wrap: anywhere;
}

.rated-card :deep(.score) {
	align-self: stretch;
	flex: none;
	justify-content: flex-end;
	font-size: 1.75rem;
	padding-bottom: 0;
}

.rated-card :deep(.score span:first-child) {
	font-size: 0.9rem;
}

.rated-card :deep(.information button) {
	width: 100%;
	max-width: 100%;
	min-height: 42px;
	padding: 0.45rem 0.75rem;
}

@media (max-width: 640px) {
	.rated-grid {
		grid-template-columns: 1fr;
	}
}
</style>
