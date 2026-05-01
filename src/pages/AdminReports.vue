<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {
	collection,
	doc,
	getDoc,
	getDocs,
	orderBy,
	query,
	updateDoc
} from 'firebase/firestore';
import {db} from '../utils/firebaseInit';

type ReportRow = {
	id: string;
	catId?: string;
	userId?: string;
	reason?: string;
	reasons?: string[];
	details?: string;
	status?: string;
	createdAt?: any;
	catName?: string;
	catImageUrl?: string;
	reporterName?: string;
	reporterEmail?: string;
};

const reports = ref<ReportRow[]>([]);
const loading = ref(true);
const errorMsg = ref<string | null>(null);
const statusFilter = ref('open');

const filteredReports = computed(() => {
	if (statusFilter.value === 'all') return reports.value;
	return reports.value.filter((report) => (report.status || 'open') === statusFilter.value);
});

function formatDate(ts: any) {
	if (!ts) return '-';
	if (ts.toDate) return ts.toDate().toLocaleString();
	return '-';
}

function formatReasons(report: ReportRow) {
	const reasons = report.reasons?.length ? report.reasons : [report.reason || 'other'];
	return reasons
		.filter(Boolean)
		.map((reason) => reason.replace(/-/g, ' '))
		.join(', ');
}

async function loadReports() {
	loading.value = true;
	errorMsg.value = null;

	try {
		const reportsQ = query(collection(db, 'catReports'), orderBy('createdAt', 'desc'));
		const snap = await getDocs(reportsQ);

		const rows = await Promise.all(
			snap.docs.map(async (reportDoc) => {
				const data = reportDoc.data() as any;
				const row: ReportRow = {
					id: reportDoc.id,
					...data
				};

				if (row.catId) {
					try {
						const catSnap = await getDoc(doc(db, 'cats', row.catId));
						if (catSnap.exists()) {
							const catData = catSnap.data() as any;
							row.catName = catData.name || 'Unnamed cat';
							row.catImageUrl = catData.imageUrl || '';
						}
					} catch (e) {
						console.warn('failed to load reported cat', e);
					}
				}

				if (row.userId) {
					try {
						const userSnap = await getDoc(doc(db, 'users', row.userId));
						if (userSnap.exists()) {
							const userData = userSnap.data() as any;
							row.reporterName =
								userData.username ||
								`${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
								userData.displayName ||
								'Unknown user';
							row.reporterEmail = userData.email || '';
						}
					} catch (e) {
						console.warn('failed to load report user', e);
					}
				}

				return row;
			})
		);

		reports.value = rows;
	} catch (e: any) {
		console.error('failed to load reports', e);
		errorMsg.value = e?.message || 'Failed to load reports.';
	} finally {
		loading.value = false;
	}
}

async function setReportStatus(report: ReportRow, status: string) {
	try {
		await updateDoc(doc(db, 'catReports', report.id), {
			status
		});
		report.status = status;
	} catch (e) {
		console.error('failed to update report status', e);
		errorMsg.value = 'Failed to update report status.';
	}
}

onMounted(loadReports);
</script>

<template>
	<section class="reports-page">
		<div class="reports-head">
			<div>
				<h1>Cat reports</h1>
				<p>Review photos that users flagged as wrong or not being cats.</p>
			</div>

			<div class="filters">
				<button :class="{ active: statusFilter === 'open' }" @click="statusFilter = 'open'">Open</button>
				<button :class="{ active: statusFilter === 'reviewed' }" @click="statusFilter = 'reviewed'">Reviewed</button>
				<button :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">All</button>
			</div>
		</div>

		<div v-if="loading" class="state">Loading reports...</div>
		<div v-else-if="errorMsg" class="state error">{{ errorMsg }}</div>

		<div v-else-if="filteredReports.length === 0" class="state">
			No reports found.
		</div>

		<div v-else class="reports-grid">
			<article
				v-for="report in filteredReports"
				:key="report.id"
				class="report-card"
			>
				<div class="report-media">
					<img v-if="report.catImageUrl" :src="report.catImageUrl" :alt="report.catName || 'Reported cat'" />
					<div v-else class="image-fallback">No image</div>
				</div>

				<div class="report-body">
					<div class="report-title">
						<h2>{{ report.catName || 'Unknown cat' }}</h2>
						<span :class="['status-pill', `status-pill--${report.status || 'open'}`]">
							{{ report.status || 'open' }}
						</span>
					</div>

					<div class="meta-line">
						<span>Reported by</span>
						<strong>{{ report.reporterName || report.reporterEmail || report.userId || 'Unknown user' }}</strong>
					</div>

					<div class="meta-line">
						<span>Submitted</span>
						<strong>{{ formatDate(report.createdAt) }}</strong>
					</div>

					<div class="reason-box">
						<span>Reason</span>
						<strong>{{ formatReasons(report) }}</strong>
						<p v-if="report.details">{{ report.details }}</p>
					</div>

					<div class="report-actions">
						<router-link v-if="report.catId" :to="`/cat/${report.catId}`">
							Open cat
						</router-link>
						<button
							v-if="(report.status || 'open') !== 'reviewed'"
							type="button"
							@click="setReportStatus(report, 'reviewed')"
						>
							Mark reviewed
						</button>
						<button
							v-else
							type="button"
							@click="setReportStatus(report, 'open')"
						>
							Reopen
						</button>
					</div>
				</div>
			</article>
		</div>
	</section>
</template>

<style scoped lang="scss">
.reports-page {
	padding: 6rem 2rem 2rem;
	color: #f8fafc;
}

.reports-head {
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
	gap: 1rem;
	margin-bottom: 1.5rem;
}

.reports-head h1 {
	font-size: 2rem;
	font-weight: 900;
}

.reports-head p {
	color: #e2e8f0;
}

.filters {
	display: flex;
	gap: 0.5rem;
}

.filters button {
	border: 1px solid rgba(255, 255, 255, 0.22);
	border-radius: 999px;
	padding: 0.45rem 0.85rem;
	background: rgba(255, 255, 255, 0.08);
	color: #fff;
	font-weight: 700;
}

.filters button.active {
	background: #fff;
	color: #6b21a8;
}

.state {
	padding: 1rem;
	border-radius: 0.9rem;
	background: rgba(15, 23, 42, 0.45);
}

.state.error {
	color: #fecaca;
}

.reports-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
	gap: 1rem;
}

.report-card {
	display: grid;
	grid-template-columns: 130px 1fr;
	gap: 1rem;
	padding: 1rem;
	border-radius: 1rem;
	background: rgba(15, 23, 42, 0.52);
	border: 1px solid rgba(255, 255, 255, 0.12);
	box-shadow: 0 14px 34px rgba(15, 23, 42, 0.25);
}

.report-media {
	height: 140px;
	border-radius: 0.8rem;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.12);
}

.report-media img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

.image-fallback {
	height: 100%;
	display: grid;
	place-items: center;
	color: #cbd5e1;
}

.report-body {
	display: flex;
	flex-direction: column;
	gap: 0.65rem;
	min-width: 0;
}

.report-title {
	display: flex;
	justify-content: space-between;
	gap: 0.75rem;
	align-items: flex-start;
}

.report-title h2 {
	font-size: 1.2rem;
	font-weight: 900;
	overflow-wrap: anywhere;
}

.status-pill {
	padding: 0.2rem 0.55rem;
	border-radius: 999px;
	font-size: 0.75rem;
	font-weight: 900;
	text-transform: uppercase;
}

.status-pill--open {
	background: #fef3c7;
	color: #92400e;
}

.status-pill--reviewed {
	background: #dcfce7;
	color: #166534;
}

.meta-line,
.reason-box {
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
}

.meta-line span,
.reason-box span {
	color: #cbd5e1;
	font-size: 0.78rem;
	font-weight: 700;
	text-transform: uppercase;
}

.reason-box {
	padding: 0.65rem;
	border-radius: 0.7rem;
	background: rgba(255, 255, 255, 0.08);
}

.reason-box p {
	color: #e2e8f0;
	margin-top: 0.25rem;
}

.report-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 0.55rem;
	margin-top: auto;
}

.report-actions a,
.report-actions button {
	border: none;
	border-radius: 999px;
	padding: 0.45rem 0.8rem;
	background: #a855f7;
	color: #fff;
	font-weight: 800;
}

.report-actions button {
	background: #334155;
}

@media (max-width: 560px) {
	.reports-head,
	.report-card {
		grid-template-columns: 1fr;
	}

	.reports-head {
		display: grid;
		align-items: start;
	}
}
</style>
