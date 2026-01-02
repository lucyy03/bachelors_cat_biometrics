<script setup lang="ts">
import {ref, onMounted} from 'vue';
import {
	collection,
	getDocs,
	query,
	where,
	doc,
	getDoc
} from 'firebase/firestore';
import {db} from '../utils/firebaseInit';
import CatPreview from '../components/CatPreview.vue';

interface Breeder {
	id: string;
	username: string;
	email?: string;
	ratingCount: number;
}

interface RatedCat {
	id: string;
	name?: string;
	breed?: string;
	age?: number;
	averageScore?: number;
	reviewCount?: number;
	imageUrl?: string;

	//new
	ratingId: string;
	ratingValues: Record<string, number>;
	overallScore?: number;
}

const breeders = ref<Breeder[]>([]);
const loading = ref(true);
const errorMsg = ref<string | null>(null);

//selected breeder and their rated cats
const selectedBreeder = ref<Breeder | null>(null);
const ratedCats = ref<RatedCat[]>([]);
const loadingRatedCats = ref(false);

onMounted(async () => {
	try {
		const q = query(
			collection(db, 'users'),
			where('role', '==', 'BREEDER')
		);
		const snap = await getDocs(q);

		const list: Breeder[] = [];
		snap.forEach((docSnap) => {
			const data = docSnap.data() as any;

			list.push({
				id: docSnap.id,
				username: data.username || 'unknown user',
				email: data.email,
				ratingCount: 0
			});
		});

		//note:for each breeder, count how many ratings they created
		await Promise.all(
			list.map(async (b) => {
				const ratingsQ = query(
					collection(db, 'ratings'),
					where('userId', '==', b.id)
				);
				const ratingsSnap = await getDocs(ratingsQ);
				b.ratingCount = ratingsSnap.size;
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
					</span>
					<span class="breeder-email">
						{{ b.email || 'no email' }}
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
							:name="cat.name"
							:breed="cat.breed"
							:age="cat.age"
							:averageScore="cat.averageScore"
							:reviewCount="cat.reviewCount"
							:imageSrc="cat.imageUrl"
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

.breeder-email {
	font-size: 0.8rem;
	color: #cbd5f5;
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
}

.rated-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
	gap: 2rem;
}

.rated-card {
	display: flex;
	flex-direction: column;
}
</style>