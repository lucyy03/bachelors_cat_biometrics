<script setup lang="ts">
import {ref, computed, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {db} from '../utils/firebaseInit';
import {doc, getDoc, runTransaction, serverTimestamp} from 'firebase/firestore';
import LayoutHeader from '../components/LayoutHeader.vue';
import {useAuth} from '../utils/useAuth';

const route = useRoute();
const router = useRouter();
const catId = route.params.id as string;

const { user } = useAuth();
const currentUserId = computed(() => user.value?.uid || null);

const cat = ref<any | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

//note:full vs short version
const ratingVersion = ref<'full' | 'short'>('full');

//note:has this breeder already rated this cat?
const hasExistingRating = ref(false);

type SliderField = {
	section: string;
	key: string;
	label: string;
	leftLabel: string;
	rightLabel: string;
};

//note:all sliders for full version
const fullFields: SliderField[] = [
	// head
	{ section: 'Head', key: 'headWidth', label: 'Head width', leftLabel: 'Narrow', rightLabel: 'Broad' },
	{ section: 'Head', key: 'cheekFullness', label: 'Cheek fullness', leftLabel: 'Flat', rightLabel: 'Full' },
	{ section: 'Head', key: 'whiskerPad', label: 'Whisker pad definition', leftLabel: 'Barely visible', rightLabel: 'Clearly rounded' },
	{ section: 'Head', key: 'chinWidth', label: 'Chin width', leftLabel: 'Narrow', rightLabel: 'Broad' },

	// ears
	{ section: 'Ears', key: 'earSize', label: 'Ear size', leftLabel: 'Small', rightLabel: 'Large' },
	{ section: 'Ears', key: 'earSet', label: 'Ear set', leftLabel: 'Close', rightLabel: 'Wide' },
	{ section: 'Ears', key: 'earTilt', label: 'Ear tilt', leftLabel: 'Straight up', rightLabel: 'Forward tilt' },
	{ section: 'Ears', key: 'earTipShape', label: 'Ear tip shape', leftLabel: 'Pointy', rightLabel: 'Rounded' },

	// eyes
	{ section: 'Eyes', key: 'eyeSize', label: 'Eye size', leftLabel: 'Small', rightLabel: 'Large' },
	{ section: 'Eyes', key: 'eyeRoundness', label: 'Eye roundness', leftLabel: 'Sharp', rightLabel: 'Round' },
	{ section: 'Eyes', key: 'eyeSpacing', label: 'Eye spacing', leftLabel: 'Close', rightLabel: 'Wide' },
	{ section: 'Eyes', key: 'eyeColorDepth', label: 'Eye color depth', leftLabel: 'Pale', rightLabel: 'Vivid' },

	// patterns
	{ section: 'Patterns', key: 'maskSymmetry', label: 'Mask symmetry', leftLabel: 'Asymmetric', rightLabel: 'Symmetrical' },
	{ section: 'Patterns', key: 'maskCoverage', label: 'Mask coverage', leftLabel: 'Small', rightLabel: 'Large' },
	{ section: 'Patterns', key: 'invertedV', label: 'Inverted V definition', leftLabel: 'Uneven', rightLabel: 'Sharp' },
	{ section: 'Patterns', key: 'whiteMarking', label: 'White marking clarity', leftLabel: 'Irregular', rightLabel: 'Clean' },
	{ section: 'Patterns', key: 'lynxClarity', label: 'Lynx pattern clarity', leftLabel: 'Faint', rightLabel: 'Strong' },
	{ section: 'Patterns', key: 'tortieBalance', label: 'Tortie patch balance', leftLabel: 'Uneven', rightLabel: 'Balanced' },
	{ section: 'Patterns', key: 'colorClarity', label: 'Color clarity', leftLabel: 'Smudged', rightLabel: 'Clean' },

	// expression
	{ section: 'Expression', key: 'expression', label: 'Expression', leftLabel: 'Soft', rightLabel: 'Sharp' },

	// overall
	{ section: 'Overall', key: 'overall', label: 'Overall rating', leftLabel: 'Very bad', rightLabel: 'Very good' }
];

//note:short version subset
const shortFields: SliderField[] = [
	// head
	{ section: 'Head', key: 'headWidth', label: 'Head width', leftLabel: 'Narrow', rightLabel: 'Broad' },
	{ section: 'Head', key: 'chinWidth', label: 'Chin width', leftLabel: 'Narrow', rightLabel: 'Broad' },

	// ears
	{ section: 'Ears', key: 'earSize', label: 'Ear size', leftLabel: 'Small', rightLabel: 'Large' },
	{ section: 'Ears', key: 'earSet', label: 'Ear set', leftLabel: 'Close', rightLabel: 'Wide' },
	{ section: 'Ears', key: 'earTipShape', label: 'Ear tip shape', leftLabel: 'Pointy', rightLabel: 'Rounded' },

	// eyes
	{ section: 'Eyes', key: 'eyeSize', label: 'Eye size', leftLabel: 'Small', rightLabel: 'Large' },
	{ section: 'Eyes', key: 'eyeSpacing', label: 'Eye spacing', leftLabel: 'Close', rightLabel: 'Wide' },

	// patterns
	{ section: 'Patterns', key: 'maskSymmetry', label: 'Mask symmetry', leftLabel: 'Asymmetric', rightLabel: 'Symmetrical' },
	{ section: 'Patterns', key: 'maskCoverage', label: 'Mask coverage', leftLabel: 'Small', rightLabel: 'Large' },

	// expression + overall
	{ section: 'Expression', key: 'expression', label: 'Expression', leftLabel: 'Soft', rightLabel: 'Sharp' },
	{ section: 'Overall', key: 'overall', label: 'Overall rating', leftLabel: 'Very bad', rightLabel: 'Very good' }
];

//note:store values for all keys 0..100
const ratingValues = ref<Record<string, number>>({});

//note:which sliders to show right now
const currentFields = computed<SliderField[]>(() =>
	ratingVersion.value === 'full' ? fullFields : shortFields
);

//note:group by section (Head, Ears, Eyes...)
const groupedFields = computed<Record<string, SliderField[]>>(() => {
	const groups: Record<string, SliderField[]> = {};
	currentFields.value.forEach(field => {
		if (!groups[field.section]) groups[field.section] = [];
		groups[field.section].push(field);
	});
	return groups;
});

async function fetchCat() {
	isLoading.value = true;
	error.value = null;
	try {
		const refDoc = doc(db, 'cats', catId);
		const snap = await getDoc(refDoc);
		if (snap.exists()) {
			cat.value = { id: snap.id, ...snap.data() };
		} else {
			error.value = 'Cat not found';
		}
	} catch (e) {
		console.error('failed to load cat', e);
		error.value = 'Failed to load cat';
	} finally {
		isLoading.value = false;
	}
}

function initRatingDefaults() {
	const allKeys = new Set<string>();
	fullFields.forEach(f => allKeys.add(f.key));
	shortFields.forEach(f => allKeys.add(f.key));

	allKeys.forEach(key => {
		if (ratingValues.value[key] != null) return;
		if (key === 'overall') {
			ratingValues.value[key] = 5; //center of 1..10
		} else {
			ratingValues.value[key] = 50; //center of 0..100
		}
	});
}

async function fetchExistingRating() {
	const uid = currentUserId.value;
	if (!uid) {
		hasExistingRating.value = false;
		return;
	}

	try {
		const ratingId = `${catId}_${uid}`;
		const ratingRef = doc(db, 'ratings', ratingId);
		const snap = await getDoc(ratingRef);

		if (!snap.exists()) {
			hasExistingRating.value = false;
			return;
		}

		const data = snap.data() as any;
		hasExistingRating.value = true;

		if (data.version === 'full' || data.version === 'short') {
			ratingVersion.value = data.version;
		}

		if (data.values && typeof data.values === 'object') {
			ratingValues.value = {
				...ratingValues.value,
				...data.values
			};
		}
	} catch (e) {
		console.error('failed to load existing rating', e);
		hasExistingRating.value = false;
	}
}

async function onSubmit() {
	const uid = currentUserId.value;
	if (!uid) {
		alert('You must be logged in as breeder to rate.');
		return;
	}

	if (!cat.value) {
		return;
	}

	const ratingId = `${catId}_${uid}`;
	const overallScore = ratingValues.value.overall ?? 5; //1..10

	try {
		await runTransaction(db, async (transaction) => {
			const catRef = doc(db, 'cats', catId);
			const ratingRef = doc(db, 'ratings', ratingId);

			const catSnap = await transaction.get(catRef);
			if (!catSnap.exists()) {
				throw new Error('cat document missing');
			}

			const catData = catSnap.data() as any;
			let avg: number = catData.averageScore ?? 0;
			let count: number = catData.reviewCount ?? 0;

			const ratingSnap = await transaction.get(ratingRef);

			let oldScore = 0;
			if (ratingSnap.exists()) {
				const oldData = ratingSnap.data() as any;
				oldScore = oldData.overallScore ?? overallScore;
			}

			if (!ratingSnap.exists()) {
				const newCount = count + 1;
				const newAvg = ((avg * count) + overallScore) / newCount;
				count = newCount;
				avg = newAvg;
			} else if (count > 0) {
				const newAvg = ((avg * count) - oldScore + overallScore) / count;
				avg = newAvg;
			}

			const now = serverTimestamp();

			transaction.set(
				ratingRef,
				{
					catId,
					userId: uid,
					version: ratingVersion.value,
					values: ratingValues.value,
					overallScore,
					updatedAt: now,
					createdAt: ratingSnap.exists() ? ratingSnap.data().createdAt : now
				},
				{ merge: true }
			);

			transaction.update(catRef, {
				averageScore: avg,
				reviewCount: count
			});
		});

		hasExistingRating.value = true;
		alert('Rating saved.');
		//optional: router.push(`/cat/${catId}`);
	} catch (e) {
		console.error('failed to submit rating', e);
		alert('Failed to submit rating, please try again.');
	}
}

watch(
	() => catId,
	() => {
		fetchCat();
	},
	{ immediate: true }
);

watch(
	currentUserId,
	() => {
		if (currentUserId.value) {
			fetchExistingRating();
		}
	},
	{ immediate: true }
);

//note:init slider defaults on mount
initRatingDefaults();

</script>

<template>
	<div>
		<LayoutHeader/>

		<div class="rate-page">
			<div v-if="isLoading" class="rate-page__center">
				Loading...
			</div>

			<div v-else-if="error" class="rate-page__center rate-page__error">
				{{ error }}
			</div>

			<div v-else-if="cat" class="rate-layout">
				<!-- left column: cat photo + info -->
				<aside class="cat-panel">
					<div class="cat-photo">
						<img
							v-if="cat.imageUrl"
							:src="cat.imageUrl"
							:alt="cat.name || 'Cat photo'"
						/>
						<div v-else class="cat-photo__placeholder">
							No photo
						</div>
						<div class="cat-name">
							{{ cat.name || 'Unnamed cat' }}
						</div>
					</div>

					<div class="cat-meta">
						<div class="meta-row">
							<span class="meta-label">Breed:</span>
							<span>{{ cat.breed }}</span>
						</div>
						<div class="meta-row">
							<span class="meta-label">Age:</span>
							<span>{{ cat.age ?? '-' }}</span>
						</div>
						<div class="meta-row">
							<span class="meta-label">Color:</span>
							<span>{{ cat.baseColor || '-' }}</span>
						</div>
						<div class="meta-row">
							<span class="meta-label">Coat pattern:</span>
							<span>{{ cat.coatPattern || '-' }}</span>
						</div>
						<div class="meta-row">
							<span class="meta-label">Coat pattern color:</span>
							<span>{{ cat.coatPatternColor || '-' }}</span>
						</div>
						<div class="meta-row">
							<span class="meta-label">Gender:</span>
							<span>{{ cat.gender || '-' }}</span>
						</div>
						<div class="meta-row">
							<span class="meta-label">Country of origin/registration:</span>
							<span>{{ cat.origin || '-' }}</span>
						</div>
					</div>
				</aside>

				<!-- right column: rating sliders -->
				<section class="rating-panel">
					<div class="version-toggle">
						<span class="version-label">Rating version:</span>
						<button
							type="button"
							class="version-pill"
							:class="{ 'version-pill--active': ratingVersion === 'full' }"
							@click="ratingVersion = 'full'"
						>
							Full
						</button>
						<button
							type="button"
							class="version-pill"
							:class="{ 'version-pill--active': ratingVersion === 'short' }"
							@click="ratingVersion = 'short'"
						>
							Short
						</button>
					</div>

					<div v-for="(fields, sectionName) in groupedFields" :key="sectionName" class="rating-section">
						<h2 class="section-title">{{ sectionName }}</h2>

						<div v-for="field in fields" :key="field.key" class="slider-row">
							<div class="slider-row__labels">
								<span class="slider-row__side slider-row__side--left">{{ field.leftLabel }}</span>
								<span class="slider-row__title">{{ field.label }}</span>
								<span class="slider-row__side slider-row__side--right">{{ field.rightLabel }}</span>
							</div>
							<input
                                v-if="field.key === 'overall'"
                                type="range"
                                min="1"
                                max="10"
                                step="1"
                                v-model.number="ratingValues[field.key]"
                                class="slider-input slider-input--overall"
                            />
                            <input
                                v-else
                                type="range"
                                min="0"
                                max="100"
                                v-model.number="ratingValues[field.key]"
                                class="slider-input"
                            />
						</div>
					</div>

                    <div class="submit-wrap">
                        <button type="button" class="submit-btn" @click="onSubmit">
                            {{ hasExistingRating ? 'Update rating' : 'Submit' }}
                        </button>
                    </div>
				</section>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.rate-page {
	min-height: 100vh;
	background: #f7f2fb;
	padding: 2.5rem 2rem 3rem;
	display: flex;
	justify-content: center;
}

.rate-page__center {
	max-width: 960px;
	width: 100%;
	text-align: center;
	margin-top: 4rem;
	font-size: 1.1rem;
}

.rate-page__error {
	color: #b91c1c;
}

.rate-layout {
	max-width: 1120px;
	width: 100%;
	display: grid;
	grid-template-columns: 260px 1fr;
	gap: 2.5rem;
}

.cat-panel {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}

.cat-photo {
	width: 220px;
	border-radius: 8px;
	overflow: hidden;
	background: #e5e5e5;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
	margin-bottom: 1.25rem;

	img {
		display: block;
		width: 100%;
		height: auto;
	}

	&__placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 260px;
		font-size: 0.9rem;
		color: #555;
	}
}

.cat-name {
	text-align: center;
	padding: 0.4rem 0.75rem 0.6rem;
	font-weight: 600;
	font-size: 1.1rem;
}

.cat-meta {
	font-size: 0.95rem;
}

.meta-row {
	display: flex;
	gap: 0.4rem;
	margin-bottom: 0.15rem;
}

.meta-label {
	font-weight: 600;
}

.rating-panel {
	background: #ffffff;
	border-radius: 10px;
	padding: 1.5rem 2rem 2rem;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.version-toggle {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	margin-bottom: 1.75rem;
}

.version-label {
	font-weight: 500;
}

.version-pill {
	border-radius: 999px;
	border: none;
	padding: 0.4rem 1.2rem;
	background: #e2e2e2;
	color: #333;
	font-weight: 500;
	cursor: pointer;
	transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.version-pill--active {
	background: #b58ad7;
	color: #fff;
	box-shadow: 0 0 0 2px #8a63b0;
}

.rating-section + .rating-section {
	margin-top: 1.8rem;
}

.section-title {
	font-size: 1.2rem;
	font-weight: 600;
	margin-bottom: 0.9rem;
}

.slider-row {
	margin-bottom: 0.9rem;
}

.slider-row__labels {
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	align-items: center;
	font-size: 0.9rem;
	margin-bottom: 0.2rem;
}

.slider-row__title {
	text-align: center;
	font-weight: 500;
}

.slider-row__side {
	font-size: 0.8rem;
	color: #555;
}

.slider-row__side--left {
	text-align: left;
}

.slider-row__side--right {
	text-align: right;
}

.slider-input {
	width: 100%;
	appearance: none;
	height: 2px;
	background: #000;
	outline: none;
}

/* webkit thumb */
.slider-input::-webkit-slider-thumb {
	appearance: none;
	width: 8px;
	height: 24px;
	background: #000;
	cursor: pointer;
}

/* firefox thumb */
.slider-input::-moz-range-thumb {
	width: 8px;
	height: 24px;
	background: #000;
	cursor: pointer;
	border: none;
}

.submit-wrap {
	display: flex;
	justify-content: center;
	margin-top: 2.5rem;
}

.submit-btn {
	border: none;
	border-radius: 999px;
	padding: 0.9rem 3.5rem;
	background: #b58ad7;
	color: #fff;
	font-size: 1.05rem;
	font-weight: 600;
	letter-spacing: 0.08em;
	cursor: pointer;
	transition: background 0.15s ease, transform 0.08s ease, box-shadow 0.15s ease;
	box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.submit-btn:hover {
	background: #a172cc;
	transform: translateY(-1px);
}

.submit-btn:active {
	transform: translateY(0);
	box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18);
}

@media (max-width: 960px) {
	.rate-layout {
		grid-template-columns: 1fr;
	}

	.cat-panel {
		flex-direction: row;
		gap: 2rem;
	}

	.cat-photo {
		margin-bottom: 0;
	}
}

@media (max-width: 720px) {
	.rate-page {
		padding: 1.5rem 1rem 2rem;
	}

	.rating-panel {
		padding: 1.2rem 1.3rem 1.7rem;
	}
}
</style>