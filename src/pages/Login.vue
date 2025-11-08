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

<script setup>
import { reactive, computed } from 'vue'

const form = reactive({
  email: '',
  password: ''
})

// computed na kontrolu, či sú obidve polia vyplnené
const isFormValid = computed(() => form.email && form.password)

function onLogin() {
  if (!isFormValid.value) return alert('Please fill in both fields 🐾')
  console.log('Login data:', form)
  alert('Frontend login complete 👍 (no backend yet).')
}
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