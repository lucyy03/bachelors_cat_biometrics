<script setup lang="ts">
import {ref, watch} from 'vue';
import {db} from '../utils/firebaseInit';
import {doc, getDoc} from 'firebase/firestore';

const props = defineProps<{
	id: string;
}>();

const cat = ref<any | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

async function fetchCat(id: string) {
	isLoading.value = true;
	error.value = null;
	cat.value = null;

	try {
		//note:load the single cat document by id
		const refDoc = doc(db, 'cats', id);
		const snap = await getDoc(refDoc);

		if (snap.exists()) {
			cat.value = {
				id: snap.id,
				...snap.data()
			};
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

//note:refetch whenever the id prop changes (and also on first render)
watch(
	() => props.id,
	(newId) => {
		if (newId) {
			fetchCat(newId);
		}
	},
	{ immediate: true }
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
			<!-- left: image -->
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
					<strong>Average score:</strong> {{ cat.averageScore }} ({{ cat.reviewCount }} reviews)
				</p>

				<p v-if="cat.comment"><strong>Comment:</strong> {{ cat.comment }}</p>
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
</style>