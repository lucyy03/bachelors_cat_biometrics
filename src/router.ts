import { createRouter, createWebHistory } from 'vue-router'

import LandingPage from './pages/LandingPage.vue'
import NewCatForm from './pages/NewCatForm.vue'
import CatsList from './pages/CatsList.vue'
import CatDetail from './pages/CatDetail.vue'
import ErrorPage from './pages/ErrorPage.vue'
import UsersList from './pages/UsersList.vue'
import Profile from './pages/Profile.vue'
import SpecialistForm from './pages/SpecialistForm.vue'
import Analyzator from './pages/Analyzer.vue'
import Analyses from './pages/Analyses.vue'
import AnalyseDetail from './pages/AnalyseDetail.vue'
import PropertyDetail from './pages/PropertyDetail.vue'
import AnalyzerOld from './pages/Analyzer-backup-more-in-one.vue'

// 👇 nové auth stránky
import SignUp from './pages/SignUp.vue'
import Login from './pages/Login.vue'

const routes = [
	{ path: '/', component: LandingPage },
	{ path: '/upload-cat', component: NewCatForm },
	{ path: '/specialist-form', component: SpecialistForm },
	{ path: '/cats-list', component: CatsList },
	{ path: '/profile', component: Profile },
	{ path: '/users-list', component: UsersList },
	{ path: '/cat/:id', component: CatDetail },
	{ path: '/cat/:id/rate', name: 'RateCat', component: () => import('./pages/RateCat.vue') },


	{ path: '/analyzer', component: Analyzator },
	{ path: '/analyses', component: Analyses },
	{ path: '/analyse/:id', component: AnalyseDetail },
	{ path: '/property/:id', component: PropertyDetail },
	{ path: '/analyzer-old', component: AnalyzerOld },

	// 👇 login a signup
	{ path: '/login', name: 'Login', component: Login },
	{ path: '/signup', name: 'SignUp', component: SignUp },

	// 404 fallback
	{ path: '/:pathMatch(.*)*', name: 'NotFound', component: ErrorPage },
]

const router = createRouter({
	history: createWebHistory(),
	routes,
})

export default router