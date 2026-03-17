<template>
  <div class="login-page">
    <div class="card fade-in">
      <h1>Log In</h1>

      <form @submit.prevent="onLogin">
        <div class="field">
          <label>Email:</label>
          <input v-model="form.email" type="email" placeholder="you@catmail.com" />
        </div>

        <div class="field">
          <label>Password:</label>
          <input v-model="form.password" type="password" placeholder="••••••••" />
        </div>

        <button class="continue" type="submit" :disabled="!isFormValid">
          Log In
        </button>

        <p class="switch">
          Don’t have an account?
          <router-link to="/signup">Sign up</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { reactive, computed, defineComponent } from 'vue';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../utils/firebaseInit';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../utils/useAuth';

export default defineComponent({
	name: 'LoginPage',
	setup() {
		const { showAuthSuccess, showAuthError } = useAuth();

		const form = reactive({
			email: '',
			password: ''
		});

		const isFormValid = computed(() => !!form.email && !!form.password);

    async function onLogin() {
      try {
        //firebase email/password login
        const cred = await signInWithEmailAndPassword(auth, form.email, form.password);

        const userDocSnap = await getDoc(doc(db, 'users', cred.user.uid));
        const userData = userDocSnap.exists() ? userDocSnap.data() : null;

        if (userData?.role === 'BREEDER') {
          const certStatus = userData?.certificateStatus;

          if (certStatus !== 'ACCEPTED') {
            await signOut(auth);

            let breederMessage =
              'Your breeder account cannot be accessed yet because no certificate approval status is available. Please contact an administrator.';

            if (certStatus === 'PENDING') {
              breederMessage =
                'Your breeder account is pending administrator approval. You will be able to sign in once your certificate has been reviewed.';
            } else if (certStatus === 'DENIED') {
              breederMessage =
                'Your breeder certificate submission was not approved. Please contact an administrator or submit an updated certificate.';
            }

            showAuthError('Login unsuccessful', breederMessage);
            return;
          }
        }

        showAuthSuccess('/', 'Login successful', 'Taking you to the homepage...');
      } catch (err: any) {
        console.error(err);

        let message = 'Login failed';
        if (err?.code === 'auth/user-not-found') {
          message = 'No user found with this email';
        } else if (err?.code === 'auth/wrong-password') {
          message = 'Wrong password';
        } else if (err?.code === 'auth/invalid-email') {
          message = 'Invalid email address';
        }

        showAuthError('Login unsuccessful', `${message}. Try again, check your credentials, or create an account.`);
      }
    }

		return { form, isFormValid, onLogin };
	}
});
</script>

<style scoped>
/* --- PAGE LAYOUT --- */
.login-page {
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
form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  color: #4f3d79;
  font-size: 13px;
  font-weight: 600;
}

input {
  width: 100%;
  padding: 11px 12px;
  border-radius: 10px;
  border: 1px solid rgba(124, 84, 200, 0.25);
  outline: none;
  background: #ffffff;
  color: #2f214b;
  transition: border .15s ease, box-shadow .15s ease;
}

input:focus {
  border-color: #7c54c8;
  box-shadow: 0 0 0 4px rgba(124, 84, 200, 0.18);
}

/* --- BUTTON --- */
.continue {
  display: block;
  width: 100%;
  padding: 14px 18px;
  margin-top: 12px;
  border: none;
  border-radius: 28px;
  background: #7c54c8;
  color: #fff;
  letter-spacing: 3px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
}
.continue:hover:enabled {
  filter: brightness(1.05);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(124, 84, 200, 0.4);
}
.continue:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* --- SWITCH TEXT --- */
.switch {
  text-align: center;
  margin-top: 10px;
  font-size: 13px;
  color: #4f3d79;
}
.switch a {
  color: #6f41bf;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s;
}
.switch a:hover {
  color: #9d7acf;
}

/* --- ANIMATION --- */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeIn 0.8s ease forwards; }
</style>
