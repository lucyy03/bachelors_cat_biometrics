<script>
import {addDoc, collection, serverTimestamp} from "firebase/firestore";
import {db} from '../utils/firebaseInit';
import { useAuth } from '../utils/useAuth';
import {getDownloadURL, getStorage, ref as firebaseStorageRef, uploadBytes} from 'firebase/storage';
import imageCompression from 'browser-image-compression';

import TextInput from "../components/inputs/TextInput.vue";
import SelectInput from "../components/inputs/SelectInput.vue";
import ImageInput from "../components/inputs/ImageInput.vue";
import FancyButton from "../components/FancyButton.vue";
import MessageBanner from "../components/MessageBanner.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";

import { computed, defineComponent } from 'vue';
import { useManualAuth } from '../utils/manualAuth';

const { isUserPermitted, user, signInWithGoogle } = useAuth();

export default defineComponent({
	name: "NewCatForm",
	components: {LoadingSpinner, TextInput, FancyButton, SelectInput, ImageInput, MessageBanner},

	// expose manual flag + combined access to the template & methods
	setup() {
		const { isLoggedIn: manualLoggedIn } = useManualAuth();
		const canAccess = computed(() => !!user?.value || manualLoggedIn.value);
		return { manualLoggedIn, canAccess };
	},

	data() {
		const defaultBreed = 'ragdoll';
		const initFormData = {
			breed: defaultBreed,
			name: '',
			age: 0,
			comment: '',
		};

		return {
			formData: initFormData,
			breedOptions: [
				{value: 'ragdoll', text: 'Ragdoll'},
			],
			imageFile: '',
			imagePreviewUrl: '',
			message: null,
			isLoading: false,
			initFormData,
			user,
			signInWithGoogle
		};
	},

	watch: {
		imageFile(newFile) {
			if (newFile) {
				this.imagePreviewUrl = URL.createObjectURL(newFile);
				this.imageFile = newFile;
			}
		}
	},

	methods: {
		resetErrorMessage() {
			this.message = null;
		},

		resetForm() {
			this.formData = this.initFormData;
			this.imageFile = '';
			this.imagePreviewUrl = '';
		},

		async submitForm() {
			// allow either manual or firebase-permitted users
			// note:no space after comment marker per your style guide
			if (!this.manualLoggedIn) {
				const permitted = await isUserPermitted();
				if (!permitted) {
					this.message = {text: 'You are not permitted to do this action', color: 'red'};
					return;
				}
			}

			if (!this.imageFile) {
				this.message = {text: 'Photo is not selected', color: 'red'};
				return;
			}

			this.isLoading = true;

			try {
				const storage = getStorage();

				// note:kept conservative compression
				const options = {
					maxSizeMB: 3,
					maxWidthOrHeight: 1920,
					useWebWorker: true,
				};

				const compressedFile = await imageCompression(this.imageFile, options);
				const storageRef = firebaseStorageRef(storage, `cats/${compressedFile.name}`);
				const snapshot = await uploadBytes(storageRef, compressedFile);
				this.formData.imageUrl = await getDownloadURL(snapshot.ref);
			} catch (e) {
				console.error('Failed to upload image:', e);
				this.message = {text: 'Error while uploading a image', color: 'red'};
				this.isLoading = false;
				return;
			}

			try {
				const docRef = await addDoc(collection(db, "cats"), {
					...this.formData,
					reviewCount: 0,
					averageScore: 5,
					addedBy: this.user.value?.email ?? (this.manualLoggedIn ? 'manual' : 'unknown'),
					addedAt: serverTimestamp(),
				});
				this.message = {text: `Cat was successfuly added. <a href="/cat/${docRef.id}" class="underline">Display this cat</a>.`, color: 'green'};
				this.resetForm();
			} catch (e) {
				console.error("Error adding document: ", e);
				this.message = {text: 'Error while adding a image', color: 'red'};
			} finally {
				this.isLoading = false;
			}
		}
	}
});
</script>

<template>
	<div class="center-child">
		<!-- changed: gate on canAccess instead of user -->
		<div class="centered-card" v-if="canAccess">
			<h1>Insert data about a cat</h1>
			<MessageBanner v-if="message" class="mb-5" :message="message.text" :color="message.color" @onClose="resetErrorMessage"/>
			<div v-if="isLoading" class="flex justify-center m-24">
				<LoadingSpinner/>
			</div>
			<form @submit.prevent="submitForm" class="flex gap-8" v-if="!isLoading">
				<ImageInput v-model="imageFile"/>
				<div class="information flex flex-col gap-3">
					<SelectInput
						label="Breed"
						:options="breedOptions"
						inputId="breed-select"
						v-model="formData.breed"
						placeholder="Select breed"
						:required="true"
					/>
					<TextInput
						label="Name"
						type="text"
						placeholder="Type a name"
						inputId="name-input"
						:required="false"
						v-model="formData.name"
					/>
					<TextInput
						label="Age (years)"
						type="number"
						placeholder="Type a age"
						inputId="age-input"
						:required="false"
						v-model="formData.age"
					/>
					<FancyButton text="Submit" type="submit" class="mt-2 self-end"/>
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
</template>

<style scoped lang="scss">
.file-and-info {
	display: flex;
	align-items: stretch;
	width: 100%;
}
</style>