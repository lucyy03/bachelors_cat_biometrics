<template>
  <div class="signup-page">
    <div class="card fade-in">
      <h1>Sign up</h1>

      <form ref="signupForm" @submit.prevent="onSubmit">
        <div class="row">
          <div class="field">
            <label>First name:</label>
            <input v-model="form.firstName" type="text" placeholder="" required />
          </div>
          <div class="field">
            <label>Last name:</label>
            <input v-model="form.lastName" type="text" placeholder="" required />
          </div>
        </div>

        <div class="field">
          <label>Username:</label>
          <input v-model="form.username" type="text" required />
        </div>

        <div class="field">
          <label>Email:</label>
          <input v-model="form.email" type="email" required />
        </div>

        <div class="field">
          <label>Password:</label>
          <input v-model="form.password" type="password" minlength="6" required />
        </div>

        <div class="field">
          <label>Nationality:</label>
          <div class="select-wrap">
            <select v-model="form.nationality" required>
              <option disabled value="">Select</option>
              <option>Slovakia</option>
              <option>Czechia</option>
              <option>Austria</option>
              <option>Poland</option>
              <option>Other</option>
            </select>
            <span class="chevron">›</span>
          </div>
        </div>

        <div class="field">
          <label>I am:</label>
          <div class="roles">
            <button
              type="button"
              :class="['pill', form.role==='breeder'?'active':'']"
              @click="form.role='breeder'"
            >
              Breeder
            </button>
            <button
              type="button"
              :class="['pill', form.role==='user'?'active':'']"
              @click="form.role='user'"
            >
              Regular user
            </button>
          </div>
        </div>

        <div class="field" v-if="form.role==='breeder'">
          <label class="important-label">* Certificate required</label>
          <div class="upload highlight">
            <span class="icon">📄</span>
            <input
              id="cert"
              type="file"
              @change="onFile"
              :required="form.role==='breeder'"
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <label for="cert">{{ fileName || 'Upload your certificate' }}</label>
          </div>
        </div>

        <!-- keep the button always enabled; native validation will block submit + show tooltip -->
        <button class="continue" type="submit">Continue</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../utils/firebaseInit';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import { uploadImageToCloudinary } from "../utils/cloudinary";

const router = useRouter();

const form = reactive({
	firstName: '',
	lastName: '',
	username: '',
	email: '',
	password: '',
	nationality: '',
	role: 'breeder'
});

const fileName = ref('');
const certFile = ref(null);
const signupForm = ref(null);
const isSubmitting = ref(false);

function onFile(e) {
	const f = e.target.files?.[0] || null;
	certFile.value = f;
	fileName.value = f ? f.name : '';
}

function isImageFile(file) {
	if (!file) return false;
	return file.type?.startsWith('image/');
}

async function uploadCertificateIfNeeded() {
	if (form.role !== 'breeder') {
		return { certificateUrl: null, certificateFileName: null, certificateStatus: null };
	}

	if (!certFile.value) {
		throw new Error('certificate_missing');
	}

	let fileToUpload = certFile.value;

	if (isImageFile(fileToUpload)) {
		const options = {
			maxSizeMB: 3,
			maxWidthOrHeight: 1920,
			useWebWorker: true
		};
		fileToUpload = await imageCompression(fileToUpload, options);
	}

	const certificateUrl = await uploadImageToCloudinary(fileToUpload);

	return {
		certificateUrl,
		certificateFileName: certFile.value.name,
		certificateStatus: 'PENDING'
	};
}

async function onSubmit() {
	if (!signupForm.value?.checkValidity()) {
		signupForm.value?.reportValidity();
		return;
	}

	if (isSubmitting.value) return;
	isSubmitting.value = true;

	try {
		console.log('[signup] start submit', { ...form });

		const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
		const user = cred.user;
		console.log('[signup] user created', user.uid);

		const displayName = form.username || `${form.firstName} ${form.lastName}`.trim();
		if (displayName) {
			await updateProfile(user, { displayName });
			console.log('[signup] profile updated', displayName);
		}

		const roleValue = form.role === 'breeder' ? 'BREEDER' : 'USER';

		const certData = await uploadCertificateIfNeeded();

		console.log('[signup] writing firestore doc…');
		await setDoc(doc(db, 'users', user.uid), {
			firstName: form.firstName,
			lastName: form.lastName,
			username: form.username,
			email: form.email,
			nationality: form.nationality,
			role: roleValue,

			certificateFileName: certData.certificateFileName,
			certificateUrl: certData.certificateUrl,
			certificateStatus: certData.certificateStatus,
			certificateUploadedAt: certData.certificateStatus ? serverTimestamp() : null,

			createdAt: serverTimestamp()
		});
		console.log('[signup] firestore user doc saved');

		alert('Account created successfully!');
		console.log('[signup] navigating to /');
		await router.push('/');
	} catch (err) {
		console.error('[signup] error during signup:', err);

		if (err?.message === 'certificate_missing') {
			alert('Certificate is required for breeders');
			return;
		}

		let msg = 'Sign up failed';
		if (err?.code === 'auth/email-already-in-use') msg = 'Email already in use';
		if (err?.code === 'auth/invalid-email') msg = 'Invalid email';
		if (err?.code === 'auth/weak-password') msg = 'Password too weak (min 6 chars)';
		if (err?.code === 'permission-denied') msg = 'You do not have permission to create this user document';

		alert(msg);

		try {
			if (user) {
				await user.delete();
			}
		} catch (e) {
			console.warn('[signup] failed to delete auth user after error', e);
		}
	} finally {
		isSubmitting.value = false;
	}
}
</script>

<style scoped>
/* --- PAGE LAYOUT --- */
.signup-page {
  min-height: 100dvh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(135deg, #BFA1D8, #9D7ACF);
  padding: 24px;
  padding-top: 140px;
  color: #2f214b;
}

/* --- CARD --- */
.card {
  width: 380px;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(8px);
  border-radius: 22px;
  padding: 24px 22px 36px;
  box-shadow: 0 12px 28px rgba(113, 73, 164, 0.25);
  animation: fadeIn 0.8s ease;
}

h1 {
  text-align: center;
  letter-spacing: 3px;
  color: #3a2b58;
  margin: 6px 0 16px;
  font-weight: 700;
}

/* --- FORM STRUCTURE --- */
form { display: flex; flex-direction: column; gap: 12px; }
.row  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field{ display: flex; flex-direction: column; gap: 6px; }

label { color: #4f3d79; font-size: 13px; font-weight: 600; }
.important-label { color: #6a1b35; font-weight: 700; font-size: 13px; letter-spacing: 0.3px; }

/* Inputs */
input, select {
  width: 100%;
  padding: 11px 12px;
  border-radius: 10px;
  border: 1px solid rgba(124, 84, 200, 0.25);
  outline: none;
  background: #ffffff;
  color: #2f214b;
  transition: border .15s ease, box-shadow .15s ease, background .2s ease;
}
input::placeholder { color: #8d7ab6; }
input:focus, select:focus {
  border-color: #7c54c8;
  box-shadow: 0 0 0 4px rgba(124, 84, 200, 0.18);
  background: #fff;
}

/* --- SELECT --- */
.select-wrap { position: relative; }
.select-wrap select {
  appearance: none; -webkit-appearance: none; -moz-appearance: none;
  background: #fff;
}
.chevron {
  position: absolute; left: 8px; top: 50%;
  transform: translateY(-50%) rotate(90deg);
  color: #6e4fbf; font-weight: 700;
}

/* --- ROLE BUTTONS --- */
.roles { display: flex; gap: 12px; }
.pill {
  padding: 10px 14px;
  border-radius: 16px;
  border: 2px solid transparent;
  background: #ece3ff;
  color: #3a2b58;
  cursor: pointer;
  transition: all 0.25s ease;
  font-weight: 600;
}
.pill:hover {
  background: #e7d7ff;
  box-shadow: 0 0 10px rgba(125, 77, 180, 0.25),
              0 0 20px rgba(125, 77, 180, 0.15);
  transform: translateY(-1px);
}
.pill.active {
  background: #f6f0ff;
  border-color: #6f41bf;
  box-shadow: 0 0 0 3px rgba(111, 65, 191, 0.12) inset;
}

/* --- UPLOAD AREA --- */
.upload {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  color: #2f214b;
  cursor: pointer;
  transition: all 0.25s ease;
}
.upload .icon { font-size: 18px; }
.upload input[type='file'] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

.upload.highlight {
  background: linear-gradient(135deg, #FFD1F0, #E7D1FF);
  border: 2px dashed rgba(111, 65, 191, 0.6);
  box-shadow: 0 0 10px rgba(170, 120, 230, 0.35);
}
.upload.highlight:hover {
  background: linear-gradient(135deg, #FFE3F6, #EFE0FF);
  box-shadow: 0 0 18px rgba(170, 120, 230, 0.45);
  transform: translateY(-1px);
}
.upload label { color: #3a2b58; margin: 0; cursor: pointer; font-weight: 700; letter-spacing: 0.2px; }

/* --- CONTINUE BUTTON --- */
.continue {
  display: block; width: 100%; max-width: 100%; box-sizing: border-box;
  padding: 14px 18px; margin-top: 12px;
  border: none; border-radius: 28px;
  background: #7c54c8;
  color: #fff; letter-spacing: 3px; font-weight: 700;
  cursor: pointer; transition: all 0.25s ease;
}
.continue:hover {
  filter: brightness(1.05);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(124, 84, 200, 0.4);
}

/* --- FADE-IN --- */
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.fade-in { animation: fadeIn 0.8s ease forwards; }
</style>