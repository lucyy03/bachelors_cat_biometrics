<script setup lang="ts">
import {ref, onMounted, computed} from 'vue';
import {useRoute} from 'vue-router';
import {db} from '../utils/firebaseInit';
import {doc, getDoc} from 'firebase/firestore';

const route = useRoute();
const rating = ref<any | null>(null);
const cat = ref<any | null>(null);
const loading = ref(true);
const errorMsg = ref<string | null>(null);

const valuesArray = computed(() => {
	if (!rating.value || !rating.value.values) return [];
	return Object.entries(rating.value.values) as [string, number][];
});

onMounted(async () => {
	try {
		const ratingId = route.params.id as string;
		const ratingRef = doc(db, 'ratings', ratingId);
		const ratingSnap = await getDoc(ratingRef);

		if (!ratingSnap.exists()) {
			errorMsg.value = 'Rating not found.';
			return;
		}

		rating.value = ratingSnap.data();

		//load cat info
		if (rating.value.catId) {
			const catRef = doc(db, 'cats', rating.value.catId);
			const catSnap = await getDoc(catRef);
			if (catSnap.exists()) {
				cat.value = catSnap.data();
			}
		}
	} catch (e) {
		console.error(e);
		errorMsg.value = 'Error loading rating.';
	} finally {
		loading.value = false;
	}
});
</script>

<template>
	<section class="p-8 text-slate-100">
		<h1 class="text-2xl mb-4">
			Rating detail
		</h1>

		<p v-if="loading">Loading rating...</p>
		<p v-else-if="errorMsg">{{ errorMsg }}</p>

		<div v-else-if="rating" class="flex flex-col gap-6">
			<div class="cat-info" v-if="cat">
				<h2 class="text-xl mb-2">
					{{ cat.name }} ({{ cat.breed }})
				</h2>
				<p>Age: {{ cat.age }} years</p>
			</div>

			<div class="rating-summary">
				<p>
					<strong>Overall score:</strong> {{ rating.overallScore }} / 10
				</p>
				<p>
					<strong>Rated at:</strong>
					{{ rating.createdAt?.toDate ? rating.createdAt.toDate().toLocaleString() : '' }}
				</p>
			</div>

			<div class="rating-values">
				<h3 class="text-lg mb-2">Filled form</h3>
				<table>
					<thead>
						<tr>
							<th>Criterion</th>
							<th>Value</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="[key, value] in valuesArray" :key="key">
							<td>{{ key }}</td>
							<td>{{ value }}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</section>
</template>

<style scoped lang="scss">
.rating-values table {
	width: 100%;
	border-collapse: collapse;
}

.rating-values th,
.rating-values td {
	border: 1px solid #94a3b8;
	padding: 0.4rem 0.6rem;
	text-align: left;
}
</style>