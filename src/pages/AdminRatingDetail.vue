<script setup lang="ts">
import {ref, onMounted, computed} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {db} from '../utils/firebaseInit';
import {collection, doc, getDoc, getDocs, query, where} from 'firebase/firestore';

const route = useRoute();
const router = useRouter();

const rating = ref<any | null>(null);
const cat = ref<any | null>(null);
const catRatings = ref<any[]>([]);
const loading = ref(true);
const errorMsg = ref<string | null>(null);

const formattedDate = computed(() => {
	const ts = rating.value?.createdAt;
	if (!ts) return '';
	if (ts.toDate) return ts.toDate().toLocaleString();
	return '';
});

function humanizeKey(key: string) {
	//turn camelCase into "Camel case"
	const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2');
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function normalizeRatingValue(key: string, value: unknown) {
	const n = Number(value);
	if (Number.isNaN(n)) return null;

	if (key === 'overall') {
		return Math.max(0, Math.min(100, n <= 10 ? n * 10 : n));
	}

	return Math.max(0, Math.min(100, n));
}

function scoreFromValues(values: Record<string, unknown> | null | undefined) {
	if (!values) return null;

	const normalized = Object.entries(values)
		.map(([key, value]) => normalizeRatingValue(key, value))
		.filter((value): value is number => value !== null);

	if (!normalized.length) return null;

	const total = normalized.reduce((sum, value) => sum + value, 0);
	return (total / normalized.length) / 10;
}

function formatScore(value: number | null) {
	if (value === null) return '-';
	return `${value.toFixed(2)} / 10`;
}

const valueItems = computed(() => {
	const v = rating.value?.values;
	if (!v) return [];
	const idealValues = cat.value?.idealRatingValues || {};
	return Object.entries(v)
		.map(([k, val]) => ({
			key: k,
			label: humanizeKey(k),
			value: Number(val),
			displayPercent: normalizeRatingValue(k, val) ?? 0,
			idealValue: idealValues[k] == null ? null : Number(idealValues[k]),
			idealPercent: normalizeRatingValue(k, idealValues[k])
		}))
		.sort((a, b) => a.label.localeCompare(b.label));
});

//simple grouping by keyword so it feels structured
function groupForKey(key: string) {
	const k = key.toLowerCase();
	if (k.includes('eye')) return 'Eyes';
	if (k.includes('ear')) return 'Ears';
	if (k.includes('mask')) return 'Mask';
	if (k.includes('head') || k.includes('chin')) return 'Head';
	if (k.includes('color')) return 'Color';
	if (k.includes('lynx')) return 'Lynx';
	return 'Other';
}

const grouped = computed(() => {
	const groups: Record<string, {label: string; value: number; displayPercent: number; idealPercent: number | null; key: string}[]> = {};
	for (const item of valueItems.value) {
		const g = groupForKey(item.key);
		if (!groups[g]) groups[g] = [];
		groups[g].push({
			label: item.label,
			value: item.value,
			displayPercent: item.displayPercent,
			idealPercent: item.idealPercent,
			key: item.key
		});
	}
	return groups;
});

function markerPosition(value: number | null) {
	if (value == null || Number.isNaN(value)) return null;
	return Math.max(0, Math.min(100, value));
}

const overall = computed(() => {
	const v = rating.value?.overallScore;
	if (v === 0) return 0;
	return v ?? null;
});

const perfectionRating = computed(() =>
	scoreFromValues(cat.value?.idealRatingValues)
);

const breederRating = computed(() =>
	scoreFromValues(rating.value?.values)
);

const overallBreedersRating = computed(() => {
	const scores = catRatings.value
		.map((r) => scoreFromValues(r.values))
		.filter((score): score is number => score !== null);

	if (!scores.length) return null;

	const total = scores.reduce((sum, score) => sum + score, 0);
	return total / scores.length;
});

const heroImageStyle = computed(() => {
	if (!cat.value?.imageUrl) return {};

	const posX = Number(cat.value.imagePosX ?? 50);
	const posY = Number(cat.value.imagePosY ?? 50);
	const scale = Number(cat.value.imageScale ?? 1);

	return {
		backgroundImage: `url(${cat.value.imageUrl})`,
		backgroundRepeat: 'no-repeat',
		backgroundPosition: `${posX}% ${posY}%`,
		backgroundSize: `${scale * 100}% auto`
	};
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

		if (rating.value.catId) {
			const catRef = doc(db, 'cats', rating.value.catId);
			const catSnap = await getDoc(catRef);
			if (catSnap.exists()) {
				cat.value = catSnap.data();
			}

			const ratingsQ = query(
				collection(db, 'ratings'),
				where('catId', '==', rating.value.catId)
			);
			const ratingsSnap = await getDocs(ratingsQ);
			catRatings.value = ratingsSnap.docs.map((d) => d.data());
		}
	} catch (e) {
		console.error(e);
		errorMsg.value = 'Error loading rating.';
	} finally {
		loading.value = false;
	}
});

function goBack() {
	router.back();
}
</script>

<template>
	<div class="page">
		<div class="shell">
			<div class="topbar">
				<button class="ghost" @click="goBack">Back</button>
				<div class="crumbs">
					<span class="muted">Admin</span>
					<span class="muted">/</span>
					<span>Rating detail</span>
				</div>
			</div>

			<div v-if="loading" class="state">Loading rating...</div>
			<div v-else-if="errorMsg" class="state error">{{ errorMsg }}</div>

			<div v-else class="layout">
				<!-- hero -->
				<section class="hero">
					<div class="hero-media">
						<div class="img-wrap" v-if="cat?.imageUrl">
							<div
								class="img-framed"
								:style="heroImageStyle"
								:aria-label="cat?.name || 'cat'"
								role="img"
							></div>
						</div>
						<div class="img-fallback" v-else>
							<div class="fallback-icon">🐾</div>
							<div class="muted">no image</div>
						</div>

						<div class="score-badge" v-if="overall !== null">
							<div class="score-num">{{ formatScore(overall).replace(' / 10', '') }}</div>
							<div class="score-sub">/ 10</div>
						</div>
					</div>

					<div class="hero-info">
						<h1 class="title">
							{{ cat?.name || 'Unknown cat' }}
							<span class="pill">{{ cat?.breed || 'Unknown breed' }}</span>
						</h1>

						<div class="meta-row">
							<div class="meta-card">
								<div class="meta-label">Age</div>
								<div class="meta-value">{{ cat?.age ?? '?' }} years</div>
							</div>

							<div class="meta-card">
								<div class="meta-label">Rated at</div>
								<div class="meta-value">{{ formattedDate }}</div>
							</div>

							<div class="meta-card">
								<div class="meta-label">Rating id</div>
								<div class="meta-value mono">{{ route.params.id }}</div>
							</div>
						</div>

						<div class="hint">
							These are the exact values submitted by the user. Values are 0–100.
						</div>
					</div>
				</section>

				<!-- right summary card -->
				<aside class="side">
					<div class="side-card">
						<div class="side-title">Quick summary</div>

						<div class="score-window">
							<div class="score-row">
								<div class="score-label">Perfection rating</div>
								<div class="score-value">{{ formatScore(perfectionRating) }}</div>
							</div>

							<div class="score-row">
								<div class="score-label">Breeder's rating</div>
								<div class="score-value">{{ formatScore(breederRating) }}</div>
							</div>

							<div class="score-row">
								<div class="score-label">Overall breeders' rating</div>
								<div class="score-value">{{ formatScore(overallBreedersRating) }}</div>
							</div>
						</div>

						<div class="divider"></div>

						<div class="kv">
							<div class="k">Overall</div>
							<div class="v">
								<span class="big">{{ formatScore(overall).replace(' / 10', '') }}</span>
								<span class="muted">/10</span>
							</div>
						</div>

						<div class="kv">
							<div class="k">Criteria count</div>
							<div class="v">{{ valueItems.length }}</div>
						</div>

						<div class="divider"></div>

						<div class="side-foot muted">
							Tip: hover a criterion to see it pop.
						</div>
					</div>
				</aside>

				<!-- groups -->
				<section class="groups">
					<div
						v-for="(items, groupName) in grouped"
						:key="groupName"
						class="group"
					>
						<div class="group-head">
							<h2 class="group-title">{{ groupName }}</h2>
							<div class="group-sub muted">{{ items.length }} items</div>
						</div>

						<div class="grid">
							<div
								v-for="it in items"
								:key="it.key"
								class="metric"
							>
								<div class="metric-top">
									<div class="metric-label">{{ it.label }}</div>
									<div class="metric-val">{{ it.value }}</div>
								</div>

								<div class="bar">
									<div class="bar-fill" :style="{ width: `${it.displayPercent}%` }"></div>
									<div
										v-if="markerPosition(it.idealPercent) !== null"
										class="bar-ideal"
										:style="{ left: `${markerPosition(it.idealPercent)}%` }"
										title="Ideal rating"
										aria-label="Ideal rating"
									></div>
								</div>

								<div class="metric-foot muted">
									0 <span class="dot"></span> 50 <span class="dot"></span> 100
								</div>
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.page {
	min-height: 100vh;
	padding: 2rem;
	color: #f8fafc;
	background: radial-gradient(1200px 600px at 20% 0%, rgba(236, 72, 153, 0.25), transparent),
		radial-gradient(1000px 500px at 80% 20%, rgba(168, 85, 247, 0.25), transparent);
}

.shell {
	max-width: 1200px;
	margin: 0 auto;
}

.topbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 1.2rem;
}

.ghost {
	border: 1px solid rgba(255, 255, 255, 0.18);
	background: rgba(15, 23, 42, 0.35);
	padding: 0.5rem 0.9rem;
	border-radius: 0.75rem;
	color: #f8fafc;
	cursor: pointer;
}

.ghost:hover {
	background: rgba(15, 23, 42, 0.55);
}

.crumbs {
	display: flex;
	gap: 0.5rem;
	align-items: center;
}

.state {
	padding: 1rem;
	border-radius: 1rem;
	background: rgba(15, 23, 42, 0.35);
	border: 1px solid rgba(255, 255, 255, 0.12);
}

.state.error {
	color: #fecaca;
}

.layout {
	display: grid;
	grid-template-columns: 1fr 320px;
	grid-template-areas:
		"hero side"
		"groups side";
	gap: 1.4rem;
}

.hero {
	grid-area: hero;
	display: grid;
	grid-template-columns: 320px 1fr;
	gap: 1.2rem;
	padding: 1.2rem;
	border-radius: 1.25rem;
	background: rgba(15, 23, 42, 0.45);
	border: 1px solid rgba(255, 255, 255, 0.12);
	backdrop-filter: blur(12px);
	box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}

.hero-media {
	position: relative;
}

.img-wrap {
	border-radius: 1rem;
	overflow: hidden;
	height: 260px;
	background: rgba(255, 255, 255, 0.06);
}

.img-framed {
	width: 100%;
	height: 100%;
	display: block;
	background-color: rgba(255, 255, 255, 0.06);
}

.img-fallback {
	border-radius: 1rem;
	height: 260px;
	display: grid;
	place-items: center;
	background: rgba(255, 255, 255, 0.06);
	border: 1px dashed rgba(255, 255, 255, 0.18);
}

.fallback-icon {
	font-size: 2rem;
}

.score-badge {
	position: absolute;
	bottom: 12px;
	right: 12px;
	display: flex;
	align-items: baseline;
	gap: 0.35rem;
	padding: 0.55rem 0.75rem;
	border-radius: 999px;
	background: rgba(0, 0, 0, 0.55);
	border: 1px solid rgba(255, 255, 255, 0.12);
}

.score-num {
	font-size: 1.5rem;
	font-weight: 900;
}

.score-sub {
	font-size: 0.9rem;
	opacity: 0.9;
}

.hero-info .title {
	font-size: 2rem;
	font-weight: 900;
	display: flex;
	align-items: center;
	gap: 0.75rem;
	flex-wrap: wrap;
}

.pill {
	font-size: 0.85rem;
	font-weight: 700;
	padding: 0.25rem 0.6rem;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(255, 255, 255, 0.12);
}

.meta-row {
	margin-top: 1rem;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 0.75rem;
}

.meta-card {
	padding: 0.85rem;
	border-radius: 1rem;
	background: rgba(255, 255, 255, 0.06);
	border: 1px solid rgba(255, 255, 255, 0.10);
}

.meta-label {
	font-size: 0.8rem;
	opacity: 0.85;
	margin-bottom: 0.25rem;
}

.meta-value {
	font-weight: 700;
}

.mono {
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
	font-size: 0.85rem;
	opacity: 0.95;
	word-break: break-all;
}

.hint {
	margin-top: 1rem;
	opacity: 0.85;
}

.side {
	grid-area: side;
}

.side-card {
	position: sticky;
	top: 1.5rem;
	padding: 1.2rem;
	border-radius: 1.25rem;
	background: rgba(15, 23, 42, 0.55);
	border: 1px solid rgba(255, 255, 255, 0.12);
	backdrop-filter: blur(12px);
	box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}

.side-title {
	font-weight: 900;
	font-size: 1.1rem;
	margin-bottom: 1rem;
}

.score-window {
	display: grid;
	gap: 0.65rem;
	padding: 0.9rem;
	border-radius: 0.75rem;
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(255, 255, 255, 0.12);
}

.score-row {
	display: grid;
	gap: 0.15rem;
}

.score-label {
	font-size: 0.78rem;
	opacity: 0.85;
}

.score-value {
	font-size: 1.08rem;
	font-weight: 900;
}

.kv {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	padding: 0.6rem 0;
}

.k {
	opacity: 0.85;
}

.v {
	font-weight: 800;
}

.big {
	font-size: 1.35rem;
}

.divider {
	height: 1px;
	background: rgba(255, 255, 255, 0.12);
	margin: 0.9rem 0;
}

.groups {
	grid-area: groups;
	display: flex;
	flex-direction: column;
	gap: 1.2rem;
}

.group {
	padding: 1.2rem;
	border-radius: 1.25rem;
	background: rgba(15, 23, 42, 0.40);
	border: 1px solid rgba(255, 255, 255, 0.12);
	backdrop-filter: blur(12px);
	box-shadow: 0 10px 26px rgba(0, 0, 0, 0.25);
}

.group-head {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	margin-bottom: 1rem;
}

.group-title {
	font-size: 1.15rem;
	font-weight: 900;
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	gap: 0.9rem;
}

.metric {
	padding: 0.9rem;
	border-radius: 1rem;
	background: rgba(255, 255, 255, 0.06);
	border: 1px solid rgba(255, 255, 255, 0.10);
	transition: transform 0.12s ease, background 0.12s ease;
}

.metric:hover {
	transform: translateY(-2px);
	background: rgba(255, 255, 255, 0.08);
}

.metric-top {
	display: flex;
	justify-content: space-between;
	gap: 0.75rem;
	align-items: baseline;
	margin-bottom: 0.6rem;
}

.metric-label {
	font-weight: 800;
}

.metric-val {
	font-weight: 900;
}

.bar {
	position: relative;
	height: 10px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.10);
}

.bar-fill {
	height: 100%;
	border-radius: 999px;
	background: linear-gradient(90deg, rgba(168, 85, 247, 1), rgba(236, 72, 153, 1));
}

.bar-ideal {
	position: absolute;
	top: -5px;
	bottom: -5px;
	width: 3px;
	border-radius: 999px;
	background: #f8fafc;
	box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.7), 0 0 10px rgba(248, 250, 252, 0.55);
	transform: translateX(-50%);
}

.metric-foot {
	margin-top: 0.45rem;
	display: flex;
	align-items: center;
	gap: 0.35rem;
	font-size: 0.75rem;
}

.dot {
	width: 4px;
	height: 4px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.35);
	display: inline-block;
}

.muted {
	opacity: 0.85;
}
</style>
