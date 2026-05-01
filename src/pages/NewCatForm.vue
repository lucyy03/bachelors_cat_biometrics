<script>
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { db } from "../utils/firebaseInit";
import { useAuth } from "../utils/useAuth";
import imageCompression from "browser-image-compression";
import { uploadImageToCloudinary } from "../utils/cloudinary";

import TextInput from "../components/inputs/TextInput.vue";
import SelectInput from "../components/inputs/SelectInput.vue";
import ImageInput from "../components/inputs/ImageInput.vue";
import FancyButton from "../components/FancyButton.vue";
import MessageBanner from "../components/MessageBanner.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";

import { computed, defineComponent } from "vue";
import { useManualAuth } from "../utils/manualAuth";

const RATING_FIELD_KEYS = [
	"headWidth",
	"cheekFullness",
	"whiskerPad",
	"chinWidth",
	"earSize",
	"earSet",
	"earTilt",
	"earTipShape",
	"eyeSize",
	"eyeRoundness",
	"eyeSpacing",
	"eyeColorDepth",
	"maskSymmetry",
	"maskCoverage",
	"invertedV",
	"whiteMarking",
	"lynxClarity",
	"tortieBalance",
	"colorClarity",
	"expression",
	"overall"
];

function randomRatingValue(key) {
	if (key === "overall") {
		return Math.floor(Math.random() * 10) + 1;
	}
	return Math.floor(Math.random() * 101);
}

function createIdealRatingValues() {
	return RATING_FIELD_KEYS.reduce((values, key) => {
		values[key] = randomRatingValue(key);
		return values;
	}, {});
}

export default defineComponent({
	name: "NewCatForm",
	components: {
		LoadingSpinner,
		TextInput,
		FancyButton,
		SelectInput,
		ImageInput,
		MessageBanner
	},

	//note:auth composable is used here (like in Profile.vue)
	setup() {
		const { user, isUserPermitted } = useAuth();
		const { isLoggedIn: manualLoggedIn } = useManualAuth();

		const canAccess = computed(() => !!user.value || manualLoggedIn.value);

		//everything returned here is available as this.user / this.isUserPermitted etc.
		return { user, isUserPermitted, manualLoggedIn, canAccess };
	},

	data() {
		const defaultBreed = "ragdoll";
		const initFormData = {
			breed: defaultBreed,
			name: "",
			age: 0,
			baseColor: "",
			coatPattern: "none",
			coatPatternColor: "",
			gender: "",
			origin: "",
			comment: "",
			imagePosX: 50,
			imagePosY: 50,
			imageScale: 1,
			imageUrl: ""
		};

		return {
			formData: { ...initFormData },
			breedOptions: [
				{ value: "ragdoll", text: "Ragdoll" }
			],
			genderOptions: [
				{ value: "male", text: "Male" },
				{ value: "female", text: "Female" },
				{ value: "unknown", text: "Unknown" }
			],
			colorOptions: [
				{ value: "seal", text: "Seal" },
				{ value: "blue", text: "Blue" },
				{ value: "chocolate", text: "Chocolate" },
				{ value: "lilac", text: "Lilac" },
				{ value: "red", text: "Red" },
				{ value: "cream", text: "Cream" },
				{ value: "seal-tortie", text: "Seal tortie" },
				{ value: "blue-cream", text: "Blue cream" },
				{ value: "chocolate-tortie", text: "Chocolate tortie" },
				{ value: "lilac-cream", text: "Lilac cream" }
			],
			patternOptions: [
				{ value: "none", text: "None" },
				{ value: "colorpoint", text: "Colorpoint" },
				{ value: "mitted", text: "Mitted" },
				{ value: "bicolor", text: "Bicolor" },
				{ value: "true-bicolor", text: "True bicolor" },
				{ value: "high-mitted", text: "High mitted" },
				{ value: "mid-high-white", text: "Mid/high white" },
				{ value: "van", text: "Van" },
				{ value: "lynx", text: "Lynx/tabby" },
				{ value: "tortie", text: "Tortie" },
				{ value: "torbie", text: "Torbie (tortie lynx)" },
				{ value: "solid", text: "Solid/self" }
			],
			originOptions: [
				{ value: "at", text: "Austria" },
				{ value: "be", text: "Belgium" },
				{ value: "bg", text: "Bulgaria" },
				{ value: "ca", text: "Canada" },
				{ value: "hr", text: "Croatia" },
				{ value: "cz", text: "Czech Republic" },
				{ value: "dk", text: "Denmark" },
				{ value: "ee", text: "Estonia" },
				{ value: "fi", text: "Finland" },
				{ value: "fr", text: "France" },
				{ value: "de", text: "Germany" },
				{ value: "gr", text: "Greece" },
				{ value: "hu", text: "Hungary" },
				{ value: "ie", text: "Ireland" },
				{ value: "it", text: "Italy" },
				{ value: "lv", text: "Latvia" },
				{ value: "lt", text: "Lithuania" },
				{ value: "lu", text: "Luxembourg" },
				{ value: "nl", text: "Netherlands" },
				{ value: "no", text: "Norway" },
				{ value: "pl", text: "Poland" },
				{ value: "pt", text: "Portugal" },
				{ value: "ro", text: "Romania" },
				{ value: "sk", text: "Slovakia" },
				{ value: "si", text: "Slovenia" },
				{ value: "es", text: "Spain" },
				{ value: "se", text: "Sweden" },
				{ value: "ch", text: "Switzerland" },
				{ value: "ru", text: "Russia" },
				{ value: "gb", text: "United Kingdom" },
				{ value: "us", text: "United States" },
				{ value: "other", text: "Other / not listed" }
			],
			imageFile: "",
			imagePreviewUrl: "",
			message: null,
			isLoading: false,
			initFormData,

			isDragging: false,
			lastX: 0,
			lastY: 0,
			minScale: 1,
			maxScale: 3
		};
	},

	computed: {
		previewStyle() {
			if (!this.imagePreviewUrl) return {};
			return {
				backgroundImage: `url(${this.imagePreviewUrl})`,
				backgroundRepeat: "no-repeat",
				backgroundSize: `${this.formData.imageScale * 100}% auto`,
				backgroundPosition: `${this.formData.imagePosX}% ${this.formData.imagePosY}%`
			};
		}
	},

	watch: {
		imageFile(newFile) {
			if (newFile) {
				this.imagePreviewUrl = URL.createObjectURL(newFile);
				this.imageFile = newFile;
				this.formData.imagePosX = 50;
				this.formData.imagePosY = 50;
				this.formData.imageScale = 1;
			}
		}
	},

	methods: {
		resetErrorMessage() {
			this.message = null;
		},

		resetForm() {
			this.formData = { ...this.initFormData };
			this.imageFile = "";
			this.imagePreviewUrl = "";
		},

		startDrag(e) {
			this.isDragging = true;
			const p = this._point(e);
			this.lastX = p.x;
			this.lastY = p.y;
		},

		onDrag(e) {
			if (!this.isDragging) return;
			const frame = this.$refs.photoFrame;
			if (!frame) return;
			const rect = frame.getBoundingClientRect();
			const p = this._point(e);

			const dx = p.x - this.lastX;
			const dy = p.y - this.lastY;

			const nx = this.formData.imagePosX - (dx / rect.width) * 100;
			const ny = this.formData.imagePosY - (dy / rect.height) * 100;

			this.formData.imagePosX = Math.max(0, Math.min(100, nx));
			this.formData.imagePosY = Math.max(0, Math.min(100, ny));

			this.lastX = p.x;
			this.lastY = p.y;
		},

		endDrag() {
			this.isDragging = false;
		},

		onWheel(e) {
			const dir = e.deltaY > 0 ? -1 : 1;
			const factor = dir > 0 ? 1.1 : 1 / 1.1;
			this.setScale(this.formData.imageScale * factor);
		},

		recenterAtClick(e) {
			const frame = this.$refs.photoFrame;
			if (!frame) return;
			const rect = frame.getBoundingClientRect();
			const p = this._point(e);
			const rx = ((p.x - rect.left) / rect.width) * 100;
			const ry = ((p.y - rect.top) / rect.height) * 100;
			this.formData.imagePosX = Math.max(0, Math.min(100, rx));
			this.formData.imagePosY = Math.max(0, Math.min(100, ry));
		},

		zoomIn() {
			this.setScale(this.formData.imageScale * 1.2);
		},

		zoomOut() {
			this.setScale(this.formData.imageScale / 1.2);
		},

		resetView() {
			this.formData.imagePosX = 50;
			this.formData.imagePosY = 50;
			this.formData.imageScale = 1;
		},

		setScale(v) {
			this.formData.imageScale = Math.max(this.minScale, Math.min(this.maxScale, v));
		},

		_point(e) {
			if (e.touches && e.touches.length) {
				return { x: e.touches[0].clientX, y: e.touches[0].clientY };
			}
			return { x: e.clientX, y: e.clientY };
		},

		async submitForm() {
			//note:permission check (BREEDER etc.)
			if (!this.manualLoggedIn) {
				const permitted = await this.isUserPermitted();
				if (!permitted) {
					this.message = {
						text: "You are not permitted to do this action",
						color: "red"
					};
					return;
				}
			}

			if (!this.imageFile) {
				this.message = { text: "Photo is not selected", color: "red" };
				return;
			}

			this.isLoading = true;

			try {
				const options = {
					maxSizeMB: 3,
					maxWidthOrHeight: 1920,
					useWebWorker: true
				};
				const compressedFile = await imageCompression(this.imageFile, options);
				const imageUrl = await uploadImageToCloudinary(compressedFile);
				this.formData.imageUrl = imageUrl;
			} catch (e) {
				console.error("failed to upload image:", e);
				this.message = {
					text: "Error while uploading an image",
					color: "red"
				};
				this.isLoading = false;
				return;
			}

			try {
				const firebaseUser = this.user; // note: from useAuth via setup
				console.log("[new-cat] firebase user:", firebaseUser);

				let addedByName = "Unknown";
				let addedByEmail = null;
				let addedBy = "Unknown";
				let addedById = null;

				if (firebaseUser) {
					//note:try to read extra info from users/{uid}
					try {
						const userDocRef = doc(db, "users", firebaseUser.uid);
						const userSnap = await getDoc(userDocRef);

						if (userSnap.exists()) {
							const u = userSnap.data();
							const nameFromDoc =
								u.username ||
								`${u.firstName || ""} ${u.lastName || ""}`.trim();

							addedByName =
								nameFromDoc ||
								firebaseUser.displayName ||
								firebaseUser.email ||
								"Unknown";
						} else {
							addedByName =
								firebaseUser.displayName ||
								firebaseUser.email ||
								"Unknown";
						}
					} catch (err) {
						console.error("failed to fetch user doc for author", err);
						addedByName =
							firebaseUser.displayName ||
							firebaseUser.email ||
							"Unknown";
					}

					addedByEmail = firebaseUser.email || null;
					addedBy = addedByName;
					addedById = firebaseUser.uid;
				} else if (this.manualLoggedIn) {
					addedByName = "Manual user";
					addedByEmail = "manual";
					addedBy = "Manual user";
				}

				const payload = {
					...this.formData,
					idealRatingValues: createIdealRatingValues(),
					reviewCount: 0,
					averageScore: 5,
					addedByName,
					addedByEmail,
					addedBy,
					addedById,
					addedAt: serverTimestamp()
				};

				console.log("[new-cat] payload:", payload);

				const docRef = await addDoc(collection(db, "cats"), payload);

				this.message = {
					text: `Cat was successfuly added. <a href="/cat/${docRef.id}" class="underline">Display this cat</a>.`,
					color: "green"
				};
				this.resetForm();
			} catch (e) {
				console.error("error adding document: ", e);
				this.message = {
					text: "Error while adding a image",
					color: "red"
				};
			} finally {
				this.isLoading = false;
			}
		}
	}
});
</script>

<template>
	<div class="page-bg">
		<div class="center-child">
			<!-- changed: gate on canAccess instead of user -->
			<div class="cat-card" v-if="canAccess">
				<h1 class="title">Insert data about cat</h1>

				<MessageBanner v-if="message" class="mb-5" :message="message.text" :color="message.color" @onClose="resetErrorMessage"/>

				<div v-if="isLoading" class="flex justify-center m-24">
					<LoadingSpinner/>
				</div>

				<form @submit.prevent="submitForm" class="form-grid" v-if="!isLoading">
					<!-- left column -->
					<div class="photo-pane">
						<!-- note:simple, convenient: drag to pan, wheel to zoom, double-click to center -->
						<div
							class="photo-frame"
							ref="photoFrame"
							:class="{'photo-frame--empty': !imagePreviewUrl}"
							:style="previewStyle"
							@mousedown.prevent="startDrag"
							@mousemove.prevent="onDrag"
							@mouseup.prevent="endDrag"
							@mouseleave.prevent="endDrag"
							@wheel.prevent="onWheel"
							@dblclick.prevent="recenterAtClick"
							@touchstart.passive="startDrag"
							@touchmove.prevent.stop="onDrag"
							@touchend="endDrag"
						>
							<div v-if="!imagePreviewUrl" class="photo-placeholder">No photo</div>
						</div>

						<div class="zoom-controls" v-if="imagePreviewUrl">
							<button type="button" class="zoom-btn" @click="zoomOut" aria-label="Zoom out">−</button>
							<div class="zoom-readout">{{ formData.imageScale.toFixed(2) }}×</div>
							<button type="button" class="zoom-btn" @click="zoomIn" aria-label="Zoom in">+</button>
							<button type="button" class="zoom-btn reset" @click="resetView" aria-label="Reset">reset</button>
						</div>

						<!-- hide native input and use ImageInput bound to same model -->
						<ImageInput v-model="imageFile" class="hidden-input"/>
						<FancyButton class="upload-btn" text="Upload photo" type="button" @click="$el.querySelector('.hidden-input input')?.click()"/>
						<div v-if="imagePreviewUrl" class="hint">drag to pan • wheel to zoom • double-click to center</div>
					</div>

					<!-- right column -->
					<div class="info-pane">
						<TextInput
							label="Name"
							type="text"
							placeholder="Optional"
							inputId="name-input"
							:required="false"
							v-model="formData.name"
							class="line-field"
						/>

						<!-- age from uploaded photo: using numeric input to match your data -->
						<TextInput
							label="Age (on uploaded photo)"
							type="number"
							placeholder="Select"
							inputId="age-input"
							:required="false"
							v-model="formData.age"
							class="line-field"
						/>

						<SelectInput
							label="Color (Base color)"
							:options="colorOptions"
							inputId="basecolor-select"
							v-model="formData.baseColor"
							placeholder="Select"
							:required="false"
							class="line-field"
						/>

						<SelectInput
							label="Coat pattern"
							:options="patternOptions"
							inputId="pattern-select"
							v-model="formData.coatPattern"
							placeholder="None"
							:required="false"
							class="line-field"
						/>

						<SelectInput
							label="Coat pattern color"
							:options="colorOptions"
							inputId="patterncolor-select"
							v-model="formData.coatPatternColor"
							placeholder="Select"
							:required="false"
							class="line-field"
						/>

						<SelectInput
							label="Breed"
							:options="breedOptions"
							inputId="breed-select"
							v-model="formData.breed"
							placeholder="Select"
							:required="true"
							class="line-field"
						/>

						<SelectInput
							label="Gender"
							:options="genderOptions"
							inputId="gender-select"
							v-model="formData.gender"
							placeholder="Select"
							:required="false"
							class="line-field"
						/>

						<SelectInput
							label="Country of origin/registration"
							:options="originOptions"
							inputId="origin-select"
							v-model="formData.origin"
							placeholder="Select"
							:required="false"
							class="line-field"
						/>

						<FancyButton text="Submit" type="submit" class="submit-btn"/>
					</div>
				</form>
			</div>

			<!-- fallback: offer both firebase and manual login paths -->
			<div class="centered-card centered-card--mini !p-16" v-else>
				<div class="flex mt-2 items-center flex-col gap-6">
					<h1>Log in to verify your cat</h1>
					<FancyButton text="Log in with Google" size="lg" @click="signInWithGoogle"/>
					<router-link class="btn" :to="{ name: 'Login' }">Manual login</router-link>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
/* add this at the very top of the style block so every build has the var */
:global(:root){ --header-h:72px; }

/* colors */
$page-bg: #cdb3db; // lavender backdrop
$card-bg: #e7e3ea; // light panel
$heading: #2f2b2f;
$text: #3e3a41;
$line: #a9a1ad;
$accent: #b58ad7;
$accent-dark: #a172cc;

.page-bg {
	min-height: 100vh;
	background: $page-bg;
	display: flex;
	align-items: center;
	justify-content: center;
	/* previously: padding: 2rem; */
	padding: calc(var(--header-h) + 2rem) 2rem 2rem;
}

.center-child {
	width: 100%;
	display: flex;
	justify-content: center;
}

.cat-card {
	width: min(1100px, 96vw);
	background: $card-bg;
	border-radius: 8px;
	padding: 3rem 4rem 3.25rem;
	box-shadow: 0 2px 8px rgba(0,0,0,.08);
}

.title {
	text-align: center;
	color: $heading;
	font-size: clamp(1.6rem, 1.2rem + 1.2vw, 2.25rem);
	letter-spacing: .04em;
	margin: 0 0 2rem 0;
}

.form-grid {
	display: grid;
	grid-template-columns: 360px 1fr;
	gap: 2.25rem 3rem;

	@media (max-width: 860px) {
		grid-template-columns: 1fr;
	}
}

/* left column */
.photo-pane {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	width: 360px; /* note:hard cap to avoid overflow into right column */
}

.photo-frame {
	position: relative;
	width: 360px;
	height: 270px;
	border-radius: 4px;
	overflow: hidden;
	background: #c0b6c7;
	box-shadow: inset 0 0 0 4px rgba(0,0,0,.06);
	cursor: grab;

	&:active { cursor: grabbing; }
}

.photo-frame--empty {
	background-image: none !important;
}

.photo-placeholder {
	display: grid;
	place-items: center;
	width: 100%;
	height: 100%;
	color: rgba(0,0,0,.45);
	font-weight: 600;
}

/* fixed controls that don't bleed into right column */
.zoom-controls {
	width: 360px; /* note:match frame width */
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: .5rem;
	margin-top: .5rem;
}

/* wipe global button styles and restyle compactly */
.zoom-btn {
	all: unset; /* note:neutralize inherited .btn rules */
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: .45rem .7rem;
	border-radius: 6px;
	background: $accent;
	color: #fff;
	cursor: pointer;
	white-space: nowrap;

	&:hover { background: $accent-dark; }
}
.zoom-btn.reset {
	background: #666;
	&:hover { background: #444; }
}

.zoom-readout {
	min-width: 3.5ch;
	text-align: center;
	opacity: .9;
}

.hidden-input {
	/* note:ImageInput renders its own input; this lets us forward click */
	display: none;
}

.upload-btn {
	margin-top: 1rem;
	background: $accent !important;
	color: #fff !important;
	padding: .9rem 1.25rem !important;
	border-radius: 6px !important;

	&:hover { background: $accent-dark !important; }
}

.hint {
	margin-top: .5rem;
	font-size: .85rem;
	opacity: .8;
}

/* right column */
.info-pane {
	display: grid;
	grid-template-columns: 1fr 1fr;
	column-gap: 1.25rem;
	row-gap: .9rem;

	@media (max-width: 980px) {
		grid-template-columns: 1fr;
	}
}

/* make inputs look like the mock's thin underline rows */
.line-field {
	:deep(label) {
		color: $text;
		font-weight: 600;
		margin-bottom: .3rem;
		display: inline-block;
	}
	:deep(input), :deep(select) {
		background: transparent;
		border: none;
		border-bottom: 2px solid $line;
		padding: .35rem .5rem .45rem;
		border-radius: 0;
		outline: none;

		&:focus {
			border-bottom-color: $accent;
			box-shadow: 0 2px 0 0 $accent;
		}
	}
	:deep(.placeholder) {
		opacity: .85;
	}
}

.submit-btn {
	grid-column: 2 / 3;
	justify-self: end;
	margin-top: .6rem;

	@media (max-width: 980px) {
		grid-column: 1 / -1;
		justify-self: end;
	}
}

/* legacy class kept for compatibility with your stylesheet */
.file-and-info {
	display: flex;
	align-items: stretch;
	width: 100%;
}

/* responsive guard to keep left column tidy on small screens */
@media (max-width: 860px) {
	.photo-pane, .zoom-controls, .photo-frame { width: 100%; max-width: 360px; }
}

/* optional guard on short viewports to avoid weird vertical centering */
@media (max-height: 740px){
	.page-bg{ align-items:flex-start; }
}
</style>
