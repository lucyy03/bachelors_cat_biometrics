<script setup lang="ts">
import {ref, onMounted} from 'vue';
import {collection, getDocs, query, where} from 'firebase/firestore';
import {db} from '../utils/firebaseInit';

interface Breeder {
	id: string;
	name?: string;
	email?: string;
}

const breeders = ref<Breeder[]>([]);
const loading = ref(true);
const errorMsg = ref<string | null>(null);

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
				name: data.name,
				email: data.email
			});
		});

		breeders.value = list;
	} catch (e) {
		errorMsg.value = 'Failed to load breeders.';
	} finally {
		loading.value = false;
	}
});
</script>

<template>
	<section class="p-8 text-slate-100">
		<h1 class="text-2xl mb-4">Breeders</h1>

		<p v-if="loading">Loading breeders...</p>
		<p v-else-if="errorMsg">{{ errorMsg }}</p>

		<table v-else class="min-w-full border border-slate-600">
			<thead>
				<tr>
					<th class="border border-slate-600 px-2 py-1 text-left">Name</th>
					<th class="border border-slate-600 px-2 py-1 text-left">Email</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="b in breeders" :key="b.id">
					<td class="border border-slate-600 px-2 py-1">
						{{ b.name || 'unknown' }}
					</td>
					<td class="border border-slate-600 px-2 py-1">
						{{ b.email || 'unknown' }}
					</td>
				</tr>
			</tbody>
		</table>
	</section>
</template>