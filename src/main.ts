import {createApp} from 'vue'
import './styles/style.scss'
import App from './App.vue'
import router from './router.ts';
import VueTippy from 'vue-tippy';
import 'tippy.js/dist/tippy.css';
import {library} from "@fortawesome/fontawesome-svg-core";
import {
    faAlignLeft,
    faArrowDown,
    faArrowRight,
    faPencil,
    faRotate,
    faCloudArrowUp,
    faCode,
    faDownload,
    faImage,
    faTrash,
    faWarning,
    faXmark,
    faChevronDown,
    faRefresh
} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'
import {analytics} from './utils/firebaseInit';

library.add(faArrowDown, faRefresh, faPencil, faChevronDown, faArrowRight, faCloudArrowUp, faXmark, faTrash, faImage, faWarning, faDownload, faCode, faAlignLeft, faImage, faRotate);

const app = createApp(App);

app.component('font-awesome-icon', FontAwesomeIcon);
app.use(router);
app.use(VueTippy, {
    directive: 'tippy', // shortcut na používanie v template
    component: 'tippy', // názov komponentu
    defaultProps: {
        placement: 'top',
        allowHTML: true,
    }
});
app.mount('#app');

console.log('Firebase Analytics Initialized:', analytics);
