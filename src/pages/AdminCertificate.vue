<template>
	<div class="page">
		<div class="card">
			<h1>Breeder certificates</h1>

			<div class="controls">
				<input
					v-model="search"
					type="text"
					placeholder="Search username, email, name"
				/>

				<select v-model="statusFilter">
					<option value="ALL">All statuses</option>
					<option value="PENDING">Pending</option>
					<option value="ACCEPTED">Accepted</option>
					<option value="DENIED">Denied</option>
					<option value="MISSING">Missing status</option>
				</select>

				<button type="button" @click="refresh">Refresh</button>
			</div>

			<div v-if="isLoading" class="muted">Loading…</div>
			<div v-else-if="error" class="error">{{ error }}</div>
			<div v-else-if="filteredBreeders.length === 0" class="muted">
				No breeders found.
			</div>

			<div v-else class="list">
				<div v-for="b in filteredBreeders" :key="b.id" class="item">
					<div class="top">
						<div class="who">
							<div class="line1">
								<span class="name">{{ b.username || '(no username)' }}</span>
								<span :class="['badge', badgeClass(b.certificateStatus)]">
									{{ displayStatus(b.certificateStatus) }}
								</span>
							</div>

							<div class="line2">
								<span>{{ b.email || '(no email)' }}</span>
								<span class="dot">•</span>
								<span>{{ (b.firstName || '') + ' ' + (b.lastName || '') }}</span>
								<span class="dot">•</span>
								<span>{{ b.nationality || '(no nationality)' }}</span>
							</div>
						</div>

						<div class="actions">
							<button
								type="button"
								class="accept"
								:disabled="busyId === b.id"
								@click="setStatus(b.id, 'ACCEPTED')"
							>
								Accept
							</button>

							<button
								type="button"
								class="deny"
								:disabled="busyId === b.id"
								@click="setStatus(b.id, 'DENIED')"
							>
								Deny
							</button>
						</div>
					</div>

					<div class="preview">
						<img
							v-if="b.certificateUrl"
							:src="b.certificateUrl"
							alt="breeder certificate"
							@click="openImage(b.certificateUrl)"
						/>
						<div v-else class="muted">
							No certificate uploaded yet.
						</div>
					</div>

					<div v-if="busyId === b.id" class="muted small">
						Updating…
					</div>
				</div>
			</div>
		</div>

		<div v-if="lightboxUrl" class="lightbox" @click="lightboxUrl=''">
			<img :src="lightboxUrl" alt="certificate large view" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { collection, onSnapshot, query, where, orderBy, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebaseInit';
import { useAuth } from '../utils/useAuth';

const { user, isAdmin } = useAuth();

type BreederRow = {
	id: string
	firstName?: string
	lastName?: string
	username?: string
	email?: string
	nationality?: string
	role?: string
	certificateUrl?: string | null
	certificateStatus?: string | null
	createdAt?: any
}

const isLoading = ref(false);
const error = ref('');
const breeders = ref<BreederRow[]>([]);
const busyId = ref('');
const search = ref('');
const statusFilter = ref<'ALL' | 'PENDING' | 'ACCEPTED' | 'DENIED' | 'MISSING'>('ALL');
const lightboxUrl = ref('');

let unsub: null | (() => void) = null;

function openImage(url: string) {
	lightboxUrl.value = url;
}

function displayStatus(status: string | null | undefined) {
	if (!status) return 'MISSING';
	return status;
}

function badgeClass(status: string | null | undefined) {
	if (!status) return 'missing';
	if (status === 'PENDING') return 'pending';
	if (status === 'ACCEPTED') return 'accepted';
	if (status === 'DENIED') return 'denied';
	return 'missing';
}

async function setStatus(uid: string, status: 'ACCEPTED' | 'DENIED') {
	if (!isAdmin.value) {
		alert('Not permitted');
		return;
	}

	busyId.value = uid;
	error.value = '';

	try {
		await updateDoc(doc(db, 'users', uid), {
			certificateStatus: status,
			certificateReviewedAt: serverTimestamp(),
			certificateReviewedBy: user.value?.uid || null
		});
	} catch (e: any) {
		console.error('[admin certificates] update failed', e);
		error.value = e?.message || 'Failed to update status';
	} finally {
		busyId.value = '';
	}
}

function startListener() {
	if (!isAdmin.value) return;

	isLoading.value = true;
	error.value = '';

	const q = query(
		collection(db, 'users'),
		where('role', '==', 'BREEDER'),
		orderBy('createdAt', 'desc')
	);

	unsub = onSnapshot(
		q,
		(snap) => {
			breeders.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
			isLoading.value = false;
		},
		(err) => {
			console.error('[admin certificates] snapshot error', err);
			error.value = err?.message || 'Failed to load breeders';
			isLoading.value = false;
		}
	);
}

function refresh() {
	if (unsub) unsub();
	startListener();
}

const filteredBreeders = computed(() => {
	const s = search.value.trim().toLowerCase();

	let list = breeders.value;

	if (statusFilter.value !== 'ALL') {
		if (statusFilter.value === 'MISSING') {
			list = list.filter((b) => !b.certificateStatus);
		} else {
			list = list.filter((b) => (b.certificateStatus || '') === statusFilter.value);
		}
	}

	if (!s) return list;

	return list.filter((b) => {
		const a = (b.username || '').toLowerCase();
		const c = (b.email || '').toLowerCase();
		const d = (b.firstName || '').toLowerCase();
		const e = (b.lastName || '').toLowerCase();
		return a.includes(s) || c.includes(s) || d.includes(s) || e.includes(s);
	});
});

onMounted(() => {
	startListener();
});

onBeforeUnmount(() => {
	if (unsub) unsub();
});
</script>

<style scoped>
.page{
	min-height: 100dvh;
	display: flex;
	justify-content: center;
	padding: 120px 24px 32px;
	background: linear-gradient(135deg, #BFA1D8, #9D7ACF);
}

.card{
	width: min(980px, 100%);
	background: rgba(255,255,255,0.6);
	backdrop-filter: blur(8px);
	border-radius: 22px;
	padding: 22px;
	box-shadow: 0 12px 28px rgba(113, 73, 164, 0.25);
	color: #2f214b;
}

h1{
	margin: 0 0 14px;
	letter-spacing: 2px;
}

.controls{
	display: flex;
	gap: 10px;
	align-items: center;
	margin-bottom: 14px;
	flex-wrap: wrap;
}

.controls input, .controls select{
	padding: 10px 12px;
	border-radius: 10px;
	border: 1px solid rgba(124, 84, 200, 0.25);
	outline: none;
	background: #fff;
}

.controls input{
	flex: 1;
	min-width: 240px;
}

.controls button{
	padding: 10px 12px;
	border-radius: 10px;
	border: none;
	background: #7c54c8;
	color: white;
	cursor: pointer;
}

.list{
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.item{
	border-radius: 16px;
	background: rgba(255,255,255,0.75);
	padding: 14px;
	border: 1px solid rgba(124, 84, 200, 0.18);
}

.top{
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 14px;
	flex-wrap: wrap;
}

.who{
	min-width: 260px;
}

.line1{
	display: flex;
	align-items: center;
	gap: 10px;
}

.name{
	font-weight: 800;
}

.badge{
	font-size: 12px;
	padding: 4px 8px;
	border-radius: 999px;
	border: 1px solid rgba(111, 65, 191, 0.25);
}

.badge.pending{
	background: #fff2cc;
}

.badge.accepted{
	background: #d8f5e6;
}

.badge.denied{
	background: #ffd6e0;
}

.badge.missing{
	background: #eee;
}

.line2{
	display: flex;
	gap: 8px;
	align-items: center;
	opacity: 0.85;
	font-size: 13px;
	margin-top: 6px;
	flex-wrap: wrap;
}

.dot{
	opacity: 0.5;
}

.actions{
	display: flex;
	gap: 10px;
}

.actions button{
	padding: 10px 12px;
	border-radius: 12px;
	border: none;
	cursor: pointer;
	font-weight: 700;
}

.accept{
	background: #2fb67a;
	color: white;
}

.deny{
	background: #d14b6a;
	color: white;
}

.preview{
	margin-top: 12px;
	display: flex;
}

.preview img{
	max-width: 520px;
	width: 100%;
	border-radius: 12px;
	border: 1px solid rgba(0,0,0,0.08);
	cursor: pointer;
}

.muted{
	opacity: 0.75;
}

.small{
	font-size: 12px;
	margin-top: 8px;
}

.error{
	padding: 12px;
	border-radius: 12px;
	background: rgba(209,75,106,0.12);
	border: 1px solid rgba(209,75,106,0.25);
	margin-top: 10px;
}

.lightbox{
	position: fixed;
	inset: 0;
	background: rgba(0,0,0,0.75);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24px;
	z-index: 9999;
}

.lightbox img{
	max-width: min(1100px, 96vw);
	max-height: 92vh;
	border-radius: 16px;
}
</style>