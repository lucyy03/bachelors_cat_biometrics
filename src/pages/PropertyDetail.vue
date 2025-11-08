<script lang="ts">
import LayoutHeader from "../components/LayoutHeader.vue";
import ValueWithAverage from '../components/ValueWithAverage.vue';
import {useRoute} from 'vue-router';
import {ref, onMounted, computed} from 'vue';
import {collection, doc, getDoc, onSnapshot, orderBy, query, updateDoc, setDoc} from 'firebase/firestore';
import {db} from '../utils/firebaseInit';
import {getDownloadURL, getStorage, ref as firebaseStorageRef, uploadBytes} from 'firebase/storage';
import LoadingSpinner from "../components/LoadingSpinner.vue";
import {useRouter} from 'vue-router';
import {kmeans} from 'ml-kmeans';
import {DBSCAN} from 'density-clustering';
import VueApexCharts from 'vue3-apexcharts';

export default {
  name: "PropertyDetail",
  components: {LoadingSpinner, LayoutHeader, ValueWithAverage, apexchart: VueApexCharts},
  setup() {
    const route = useRoute();
    const propertyId = route.params.id.toString();
    const propertyIdInput = ref(propertyId);
    const analyses = ref([]);
    const isLoading = ref(true);
    const showData = ref(true);
    const router = useRouter();
    const clusteringFeature = ref('');
    const customImageUrl = ref('');

    function fetchAnalyses() {
      const q = query(collection(db, "analyses"), orderBy("createdAt", "desc"));
      onSnapshot(q, (querySnapshot) => {
        analyses.value = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      });
    }

    onMounted(async () => {
      fetchAnalyses();

      const propRef = doc(db, 'data', 'properties');
      const propSnap = await getDoc(propRef);
      if (propSnap.exists()) {
        const data = propSnap.data();
        const detail = getNestedValue(data, propertyId + '.customTitle');
        if (detail) {
          propertyIdInput.value = detail;
        }
        const detailFeature = getNestedValue(data, propertyId + '.customClusteringFeature');
        if (detailFeature) {
          clusteringFeature.value = detailFeature;
        }
        const imageUrl = getNestedValue(data, propertyId + '.customImageUrl');
        if (imageUrl) {
          customImageUrl.value = imageUrl;
        }
      }
      performClustering();
      isLoading.value = false;
    });

    function toggleData() {
      showData.value = !showData.value;
    }

    function goToDetail(id) {
      console.log("goto")
      router.push(`/analyse/${id}`);
    }

    function getNestedValue(obj, path) {
      return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    // Chart options for ApexCharts
    const chartOptions = ref<any>(null);

    function prepareChart(result) {
      const seriesData = analyses.value.map((item, index) => {
        const earDistance = getNestedValue(item, propertyId) || 0;
        const featureValue = getNestedValue(item, clusteringFeature.value) || 0;
        return {
          x: earDistance,
          y: featureValue,
          kmeansCluster: result.kmeansClusters[index],
          dbscanCluster: result.dbscanClusters[index],
          imageUrl: item.originalImageUrl
        };
      });

      chartOptions.value = {
        kmeansOptions: {
          chart: {
            height: 400,
            type: 'scatter',
            zoom: {
              enabled: true,
              type: 'xy'
            },
            toolbar: {show: true}
          },
          tooltip: {
            custom: ({series, seriesIndex, dataPointIndex, w}) => {
              const pointData = w.config.series[seriesIndex].data[dataPointIndex].customData;
              return pointData?.imageUrl
                  ? `<div style="padding: 5px; text-align: center;"><img src="${pointData.imageUrl}" style="max-width: 150px; max-height: 150px;" /></div>`
                  : '';
            }
          },
          xaxis: {title: {text: 'Ear Distance'}},
          yaxis: {title: {text: clusteringFeature.value}}
        },
        kmeansSeries: [
          {
            name: 'KMeans Cluster 0',
            data: seriesData.filter(d => d.kmeansCluster === 0).map(d => ({
              x: d.x,
              y: d.y,
              customData: {imageUrl: d.imageUrl}
            }))
          },
          {
            name: 'KMeans Cluster 1',
            data: seriesData.filter(d => d.kmeansCluster === 1).map(d => ({
              x: d.x,
              y: d.y,
              customData: {imageUrl: d.imageUrl}
            }))
          }
        ],
        dbscanOptions: {
          chart: {
            height: 400,
            type: 'scatter',
            zoom: {
              enabled: true,
              type: 'xy'
            },
            toolbar: {show: true}
          },
          tooltip: {
            custom: ({series, seriesIndex, dataPointIndex, w}) => {
              const pointData = w.config.series[seriesIndex].data[dataPointIndex].customData;
              return pointData?.imageUrl
                  ? `<div style="padding: 5px; text-align: center;"><img src="${pointData.imageUrl}" style="max-width: 150px; max-height: 150px;" /></div>`
                  : '';
            }
          },
          xaxis: {title: {text: 'Ear Distance'}},
          yaxis: {title: {text: clusteringFeature.value}}
        },
        dbscanSeries: [
          {
            name: 'DBSCAN Cluster 0',
            data: seriesData.filter(d => d.dbscanCluster === 0).map(d => ({
              x: d.x,
              y: d.y,
              customData: {imageUrl: d.imageUrl}
            }))
          },
          {
            name: 'DBSCAN Cluster 1',
            data: seriesData.filter(d => d.dbscanCluster === 1).map(d => ({
              x: d.x,
              y: d.y,
              customData: {imageUrl: d.imageUrl}
            }))
          }
        ]
      };
    }

    function performClustering() {
      if (!analyses.value.length || !clusteringFeature.value) return;

      const data = analyses.value.map(item => {
        const earDistance = getNestedValue(item, propertyId) || 0;
        const featureValue = getNestedValue(item, clusteringFeature.value) || 0;
        return [earDistance, featureValue];
      });

      const kmeansResult = kmeans(data, 2);

      const dbscan = new DBSCAN();
      const dbscanClustersArr = dbscan.run(data, 10, 2); // eps=10, minPts=2
      const dbscanLabels = new Array(data.length).fill(-1);
      dbscanClustersArr.forEach((cluster, idx) => {
        cluster.forEach(pointIdx => {
          dbscanLabels[pointIdx] = idx;
        });
      });

      const result = {
        kmeansClusters: kmeansResult.clusters,
        kmeansCentroids: kmeansResult.centroids,
        dbscanClusters: dbscanLabels
      };

      console.log('KMeans Cluster Centers:', kmeansResult.centroids);
      console.log('KMeans Labels:', kmeansResult.clusters);
      console.log('DBSCAN Labels:', dbscanLabels);
      prepareChart(result);
    }

    async function updateCustomTitle() {
      if (!propertyIdInput.value) return;
      const propRef = doc(db, 'data', 'properties');
      await updateDoc(propRef, {
        [`${propertyId}.customTitle`]: propertyIdInput.value
      }).catch(async (error) => {
        if (error.code === 'not-found' || error.message.includes('No document to update')) {
          await setDoc(propRef, {
            [`${propertyId}.customTitle`]: propertyIdInput.value
          });
        } else {
          console.error('Failed to update or create document:', error);
        }
      });
    }

    async function updateCustomClusteringFeature() {
      if (!clusteringFeature.value) return;
      const propRef = doc(db, 'data', 'properties');
      await updateDoc(propRef, {
        [`${propertyId}.customClusteringFeature`]: clusteringFeature.value
      }).catch(async (error) => {
        if (error.code === 'not-found' || error.message.includes('No document to update')) {
          await setDoc(propRef, {
            [`${propertyId}.customClusteringFeature`]: clusteringFeature.value
          });
        } else {
          console.error('Failed to update or create document:', error);
        }
      });
    }

    // Overí, či má parameter približne normálne rozdelenie.
    // Skontroluje, či aspoň 68 % hodnôt leží v intervale ±1 smerodajná odchýlka od priemeru.
    // Používa sa na jednoduchú detekciu približnej Gaussovej krivky v dátach.
    const isNormallyDistributed = computed(() => {
      if (!chartOptions.value || !chartOptions.value.kmeansSeries.length) return false;

      const allYValues = chartOptions.value.kmeansSeries.flatMap(serie =>
          serie.data.map(d => d.y)
      );

      const mean = allYValues.reduce((sum, val) => sum + val, 0) / allYValues.length;
      const stdDev = Math.sqrt(allYValues.reduce((sum, val) => sum + (val - mean) ** 2, 0) / allYValues.length);

      let countWithinOneStdDev = allYValues.filter(val => Math.abs(val - mean) <= stdDev).length;
      let proportion = countWithinOneStdDev / allYValues.length;

      return proportion >= 0.68; // If about 68% of values are within 1 std deviation => roughly normal
    });

    // Add updateCustomImage function for uploading property image
    async function updateCustomImage(event) {
      const file = event?.target?.files?.[0];
      if (!file) return;

      const storage = getStorage();
      const storageRef = firebaseStorageRef(storage, `properties/${propertyId}/${file.name}`);

      try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);

        const propRef = doc(db, 'data', 'properties');
        await updateDoc(propRef, {
          [`${propertyId}.customImageUrl`]: downloadUrl
        }).catch(async (error) => {
          if (error.code === 'not-found' || error.message.includes('No document to update')) {
            await setDoc(propRef, {
              [`${propertyId}.customImageUrl`]: downloadUrl
            });
          } else {
            console.error('Failed to update or create document:', error);
          }
        });

        customImageUrl.value = downloadUrl;

      } catch (e) {
        console.error('Failed to upload and save image:', e);
      }
    }

    return {
      propertyId,
      propertyIdInput,
      analyses,
      isLoading,
      toggleData,
      showData,
      goToDetail,
      getNestedValue,
      updateCustomTitle,
      updateCustomClusteringFeature,
      performClustering,
      chartOptions,
      clusteringFeature,
      isNormallyDistributed,
      updateCustomImage,
      customImageUrl
    };
  }
};
</script>

<template>
  <div>
    <LayoutHeader/>
    <div class="content w-full without-title p-4">
      <div class="container">
        <div v-if="isLoading" class="flex justify-center">
          <LoadingSpinner/>
        </div>
        <div v-else-if="!analyses" class="text-center">None data.</div>
        <div v-else>
          <h1 class="text-2xl mb-4">
            Analyse of:
            <input v-model="propertyIdInput" @change="updateCustomTitle"
                   :content="propertyIdInput !== propertyId ? propertyId : 'Click to edit name'" v-tippy
                   class="font-bold border-b border-transparent bg-transparent ml-2 focus:outline-0 focus:border-b hover:border-slate-800"/>
          </h1>
          <div class="flex justify-between gap-2">
            <div class="clustering flex-1">
              <div class="flex gap-5 mb-5">
                <button @click="performClustering">
                  Perform Clustering with
                </button>
                <input v-model="clusteringFeature" @change="updateCustomClusteringFeature"
                       placeholder="e.g., nose.width" class="border p-2 mr-2"/>
              </div>
              <div v-if="chartOptions">
                <h2 class="text-xl font-bold mb-2">KMeans Clustering</h2>
                <apexchart width="80%" type="scatter" :options="chartOptions.kmeansOptions"
                           :series="chartOptions.kmeansSeries"/>
              </div>
              <div v-if="chartOptions && chartOptions.kmeansSeries.length"
                   class="border rounded- xl text-xl p-4 mb-4 w-fit">
                <p v-if="isNormallyDistributed">The parameter has approximately normal distribution.</p>
                <p v-else>The parameter does not have normal distribution.</p>
              </div>
            </div>
            <div class="data basis-[400px]">
              <div v-if="Object.keys(analyses).length"
                   class="mb-4 bg-gray-50 p-4 border border-gray-200 rounded hover:bg-gray-100 transition-all cursor-pointer"
                   @click="toggleData">
                <h3 class="text-lg font-semibold flex justify-between items-center">
                  All data
                  <font-awesome-icon icon="chevron-down" class="transition-all" :class="{'rotate-180': showData}"/>
                </h3>
                <div v-show="showData" class="">
                  <div class="flex flex-wrap gap-2 mt-2">
                    <div v-for="(value, key) in analyses" :key="key" @click="goToDetail(value.id)"
                         class="hover:underline">
                  <span
                      v-tippy="{ content: '<img src=' + value.originalImageUrl + ' style=\'max-height: 300px;\'/>', allowHTML: true, placement: 'bottom' }">
                    {{ getNestedValue(value, propertyId) }}
                  </span><span v-if="key !== analyses.length - 1">,</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="parameter-image">
                <label for="upload-image" class="cursor-pointer flex items-center gap-2 flex-col">
                  <div v-if="customImageUrl" class="flex justify-center mt-4">
                    <img :src="customImageUrl" alt="Custom Property" class="rounded-lg shadow-md">
                  </div>
                  <div class="button-text hover:underline">
                    <font-awesome-icon icon="image"/>
                    {{ customImageUrl ? 'Edit' : 'Add' }} property image
                  </div>
                </label>
                <input id="upload-image" type="file" class="hidden" @change="updateCustomImage">
              </div>
            </div>
          </div>
          <div v-if="chartOptions">
            <h2 class="text-xl mb-2 mt-5" v-if="clusteringFeature">Images in groups</h2>
            <div class="flex flex-col gap-2 mt-4">
              <div class="cluser-group">
                <h3 class="text-lg font-bold mb-2">Cluster 0</h3>
                <div class="flex flex-wrap gap-2">
                  <div
                      v-for="(item, index) in analyses.filter((_, idx) => chartOptions.kmeansSeries[0].data.some(d => d.x === getNestedValue(analyses[idx], propertyId) && d.y === getNestedValue(analyses[idx], clusteringFeature)))"
                      :key="'c0-' + index"
                  >
                    <img :src="item.originalImageUrl" alt="Cluster 0 Image"/>
                  </div>
                </div>
              </div>
              <div class="cluser-group">
                <h3 class="text-lg font-bold mb-2">Cluster 1</h3>
                <div class="flex flex-wrap gap-2">
                  <div
                      v-for="(item, index) in analyses.filter((_, idx) => chartOptions.kmeansSeries[1].data.some(d => d.x === getNestedValue(analyses[idx], propertyId) && d.y === getNestedValue(analyses[idx], clusteringFeature)))"
                      :key="'c1-' + index"
                  >
                    <img :src="item.originalImageUrl" alt="Cluster 1 Image"/>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="chartOptions" class="mt-5">
              <hr class="mb-5">
              <h2 class="text-xl font-bold mb-2">DBSCAN Clustering</h2>
              <apexchart width="60%" type="scatter" :options="chartOptions.dbscanOptions"
                         :series="chartOptions.dbscanSeries"/>
            </div>
            <div class="flex flex-col gap-2 mt-4">
              <div class="cluser-group">
                <h3 class="text-lg font-bold mb-2">DBSCAN Cluster 0</h3>
                <div class="flex flex-wrap gap-2">
                  <div
                      v-for="(item, index) in analyses.filter((_, idx) => chartOptions.dbscanSeries[0].data.some(d => d.x === getNestedValue(analyses[idx], propertyId) && d.y === getNestedValue(analyses[idx], clusteringFeature)))"
                      :key="'d0-' + index"
                  >
                    <img :src="item.originalImageUrl" alt="DBSCAN Cluster 0 Image"/>
                  </div>
                </div>
              </div>
              <div class="cluser-group">
                <h3 class="text-lg font-bold mb-2">DBSCAN Cluster 1</h3>
                <div class="flex flex-wrap gap-2">
                  <div
                      v-for="(item, index) in analyses.filter((_, idx) => chartOptions.dbscanSeries[1].data.some(d => d.x === getNestedValue(analyses[idx], propertyId) && d.y === getNestedValue(analyses[idx], clusteringFeature)))"
                      :key="'d1-' + index"
                  >
                    <img :src="item.originalImageUrl" alt="DBSCAN Cluster 1 Image"/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.cluser-group {
  @apply border border-slate-200 rounded-lg p-4 mb-4;

  img {
    @apply max-h-28 rounded shadow;
  }
}

.parameter-image {
  @apply flex gap-2 items-center justify-center mt-2 text-slate-400 flex-col pb-12;

  &:has(img) .button-text {
    @apply hidden;
  }

  &:has(img):hover .button-text {
    @apply inline-block;
  }
}
</style>
