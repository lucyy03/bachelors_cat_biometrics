<script lang="ts">
import LayoutHeader from "../components/LayoutHeader.vue";
import ValueWithAverage from '../components/ValueWithAverage.vue';
import {useRoute} from 'vue-router';
import {ref, onMounted} from 'vue';
import {doc, getDoc, updateDoc} from 'firebase/firestore';
import {db} from '../utils/firebaseInit';
import LoadingSpinner from "../components/LoadingSpinner.vue";

export default {
  name: "AnalyseDetail",
  components: {LoadingSpinner, LayoutHeader, ValueWithAverage},
  setup() {
    const route = useRoute();
    const analyseId = route.params.id.toString();
    const analysis = ref<any>(null);
    const isLoading = ref(true);
    const averages = ref<any>({});

    onMounted(async () => {
      const docRef = doc(db, 'analyses', analyseId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        analysis.value = docSnap.data();
        if (!docSnap.data().seen) {
          await updateDoc(docRef, {seen: true});
          analysis.value.seen = true;
        }
      }
      const averagesDocRef = doc(db, 'data', 'averages');
      const averagesSnap = await getDoc(averagesDocRef);
      if (averagesSnap.exists()) {
        averages.value = averagesSnap.data();
      }
      isLoading.value = false;
    });

    const fixSpaceBetween = async () => {
      if (!analysis.value || !analysis.value.eyes) return;
      analysis.value.eyes.spaceBetween = "loading";
      const leftEye = {
        x: analysis.value.eyes.left?.position?.x || 0,
        rect: {
          width: analysis.value.eyes.left?.width || 0,
        },
      };
      const rightEye = {
        x: analysis.value.eyes.right?.position?.x || 0,
      };
      const leftEyeRight = leftEye.x + leftEye.rect.width;
      const rightEyeLeft = rightEye.x;
      const spaceBetween = Math.floor(Math.abs(rightEyeLeft - leftEyeRight));

      const docRef = doc(db, 'analyses', analyseId);
      await updateDoc(docRef, {
        'eyes.spaceBetween': spaceBetween
      });
      analysis.value.eyes.spaceBetween = spaceBetween;
    };

    return {analyseId, analysis, isLoading, averages, fixSpaceBetween};
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
        <div v-else-if="!analysis" class="text-center">Analysis not found.</div>
        <div v-else>
          <h1 class="text-2xl font-bold mb-4">Analysis Details</h1>
          <div class="flex justify-between">
            <div>
              <section class="mb-6">
                <h2 class="text-xl font-semibold mb-2">Nose</h2>
                <p><strong>Position:</strong> x:
                  <ValueWithAverage :value="analysis.nose?.position?.x" :average="averages['nose.position.x']"/>
                  , y:
                  <ValueWithAverage :value="analysis.nose?.position?.y" :average="averages['nose.position.y']"/>
                </p>
                <p><strong>Top Point:</strong> x:
                  <ValueWithAverage :value="analysis.nose?.topPoint?.x" :average="averages['nose.topPoint.x']"/>
                  , y:
                  <ValueWithAverage :value="analysis.nose?.topPoint?.y" :average="averages['nose.topPoint.y']"/>
                </p>
                <p><strong>Bottom Point:</strong> x:
                  <ValueWithAverage :value="analysis.nose?.bottomPoint?.x" :average="averages['nose.bottomPoint.x']"/>
                  , y:
                  <ValueWithAverage :value="analysis.nose?.bottomPoint?.y" :average="averages['nose.bottomPoint.y']"/>
                </p>
                <p><strong>Angle:</strong>
                  <ValueWithAverage :value="analysis.nose?.angle" :average="averages['nose.angle']"/>
                </p>
                <p><strong>Height:</strong>
                  <ValueWithAverage :value="analysis.nose?.height" :average="averages['nose.height']"/>
                </p>
                <p><strong>Width:</strong>
                  <ValueWithAverage :value="analysis.nose?.width" :average="averages['nose.width']"/>
                </p>
              </section>

              <section class="mb-6">
                <h2 class="text-xl font-semibold mb-2">Eyes</h2>
                <p class="mb-2"><strong>Space between: </strong>
                  <ValueWithAverage :value="analysis.eyes?.spaceBetween" :average="averages['eyes.spaceBetween']"/>
                  <font-awesome-icon icon="refresh"
                                     class="transition-all hover:rotate-180 ml-2 text-slate-400 cursor-pointer"
                                     @click.stop="fixSpaceBetween"/>
                </p>
                <div class="flex gap-5">
                  <div>
                    <h3 class="font-semibold">Left Eye</h3>
                    <p><strong>Position:</strong> x:
                      <ValueWithAverage :value="analysis.eyes?.left?.position?.x"
                                        :average="averages['eyes.left.position.x']"/>
                      , y:
                      <ValueWithAverage :value="analysis.eyes?.left?.position?.y"
                                        :average="averages['eyes.left.position.y']"/>
                    </p>
                    <p><strong>Width:</strong>
                      <ValueWithAverage :value="analysis.eyes?.left?.width" :average="averages['eyes.left.width']"/>
                    </p>
                    <p><strong>Height:</strong>
                      <ValueWithAverage :value="analysis.eyes?.left?.height" :average="averages['eyes.left.height']"/>
                    </p>
                  </div>
                  <div class="mt-2">
                    <h3 class="font-semibold">Right Eye</h3>
                    <p><strong>Position:</strong> x:
                      <ValueWithAverage :value="analysis.eyes?.right?.position?.x"
                                        :average="averages['eyes.right.position.x']"/>
                      , y:
                      <ValueWithAverage :value="analysis.eyes?.right?.position?.y"
                                        :average="averages['eyes.right.position.y']"/>
                    </p>
                    <p><strong>Width:</strong>
                      <ValueWithAverage :value="analysis.eyes?.right?.width" :average="averages['eyes.right.width']"/>
                    </p>
                    <p><strong>Height:</strong>
                      <ValueWithAverage :value="analysis.eyes?.right?.height" :average="averages['eyes.right.height']"/>
                    </p>
                  </div>
                </div>
              </section>

              <section class="mb-6">
                <h2 class="text-xl font-semibold mb-2">Ears</h2>
                <div class="flex gap-5">
                  <div>
                    <h3 class="font-semibold">Left Ear</h3>
                    <p><strong>Position:</strong> x:
                      <ValueWithAverage :value="analysis.ears?.left?.position?.x"
                                        :average="averages['ears.left.position.x']"/>
                      , y:
                      <ValueWithAverage :value="analysis.ears?.left?.position?.y"
                                        :average="averages['ears.left.position.y']"/>
                    </p>
                    <p><strong>Width:</strong>
                      <ValueWithAverage :value="analysis.ears?.left?.width" :average="averages['ears.left.width']"/>
                    </p>
                    <p><strong>Height:</strong>
                      <ValueWithAverage :value="analysis.ears?.left?.height" :average="averages['ears.left.height']"/>
                    </p>
                  </div>
                  <div class="mt-2">
                    <h3 class="font-semibold">Right Ear</h3>
                    <p><strong>Position:</strong> x:
                      <ValueWithAverage :value="analysis.ears?.right?.position?.x"
                                        :average="averages['ears.right.position.x']"/>
                      , y:
                      <ValueWithAverage :value="analysis.ears?.right?.position?.y"
                                        :average="averages['ears.right.position.y']"/>
                    </p>
                    <p><strong>Width:</strong>
                      <ValueWithAverage :value="analysis.ears?.right?.width" :average="averages['ears.right.width']"/>
                    </p>
                    <p><strong>Height:</strong>
                      <ValueWithAverage :value="analysis.ears?.right?.height" :average="averages['ears.right.height']"/>
                    </p>
                  </div>
                </div>
              </section>

              <section class="mb-6">
                <h2 class="text-xl font-semibold mb-2">Chin</h2>
                <p><strong>Base Points:</strong></p>
                <ul class="list-disc ml-6">
                  <li v-for="(point, index) in analysis.chin?.basePoints" :key="index">x:
                    <ValueWithAverage :value="point.x" :average="averages['chin.basePoints.' + index + '.x']"/>
                    , y:
                    <ValueWithAverage :value="point.y" :average="averages['chin.basePoints.' + index + '.y']"/>
                  </li>
                </ul>
                <p class="mt-2"><strong>Coefficients:</strong> a:
                  <ValueWithAverage :value="analysis.chin?.coefficients?.a" :average="averages['chin.coefficients.a']"/>
                  , b:
                  <ValueWithAverage :value="analysis.chin?.coefficients?.b" :average="averages['chin.coefficients.b']"/>
                  , c:
                  <ValueWithAverage :value="analysis.chin?.coefficients?.c" :average="averages['chin.coefficients.c']"/>
                </p>
              </section>
            </div>

            <section class="mb-6">
              <h2 class="text-xl font-semibold mb-2">Images</h2>
              <div v-if="analysis.originalImageUrl" class="mt-2">
                <h3 class="font-semibold mb-1">Original Image</h3>
                <img :src="analysis.originalImageUrl" class="max-w-sm border" alt="Original"/>
              </div>
              <div v-if="analysis.processedImageUrl" class="mt-2">
                <h3 class="font-semibold mb-1">Processed Image</h3>
                <img :src="analysis.processedImageUrl" class="max-w-sm border" alt="Processed"/>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
</style>
