<template>
  <div>
    <LayoutHeader/>
    <div class="content w-full without-title">
      <div class="container flex flex-col gap-10">
        <div v-if="!data" class="flex gap-2 items-center w-full justify-center flex-col">
          <button class="text !text-slate-500 hover:!text-black" @click="loadExampleImage">
            Load Example Image
          </button>
          <label for="fileInput" class="file-input-container">
            <div class="icon-container">
              <font-awesome-icon icon="image" size="4x"/>
            </div>
            <span class="file-input-text">Click to select an image</span>
            <input
                type="file"
                id="fileInput"
                @change="onFileChange"
                accept="image/*"
                hidden
            />
          </label>
        </div>
        <div v-else class="flex gap-8 items-start">
          <div :class="['image-holder glowing', {'glowing--disabled': !isLoading && !manualMode}]">
            <canvas ref="canvasRef"
                    @click="onCanvasClick"
            >
            </canvas>
            <img v-if="data.currentSnapshot && !manualMode" :src="data.currentSnapshot"
                 class="main-image-replacement shadow-2xl rounded"
                 @click="onCanvasClick"
                 alt="snapshot preview"
            />
          </div>
          <div class="view-result flex-[1.5]">
            <div v-if="isJsonView" class="json-view">
              <div class="absolute right-2 top-2 flex gap-2">
                <button class="json-button" @click="downloadAnalysis">
                  <font-awesome-icon icon="download" fixed-width/>
                </button>
                <button class="json-button" @click="toggleView">
                  <font-awesome-icon icon="align-left" fixed-width/>
                </button>
              </div>
              <pre>{{ filteredAnalysis }}</pre>
            </div>
            <div v-else class="flex flex-col gap-2 relative">
              <div class="result-text-item flex !flex-row justify-between">
                <div class="attribute">File: <strong class="text-slate-700">{{ data.filename }}</strong></div>
                <button class="json-button" @click="toggleView">
                  <font-awesome-icon icon="code" fixed-width/>
                </button>
              </div>
              <button class="primary w-full" @click="handleProcess" v-if="!data.analysis.nose && !isLoading">
                Start analysis
              </button>

              <div v-if="isLoading">
                <LoadingSpinner/>
              </div>

              <div v-if="savedAnalyseId">
                <router-link :to="`/analyse/${savedAnalyseId}`" class="primary w-full inline-block text-center">
                  <button>
                    View Detailed Analysis
                  </button>
                </router-link>
              </div>

              <!-- CHIN SECTION-->
              <div v-if="data.analysis?.chin"
                   :class="['section', {'glowing': !manualMode && !data.analysis.chin?.completed}]">
                <div class="result-text-item is-title">Chin</div>
                <div class="flex gap-10">
                  <div class="result-text-item">
                    <div class="attribute">Base Points</div>
                    <div class="value">
                      <span v-for="(pt, idx) in data.analysis.chin.basePoints" :key="idx">
                        {{ pt.x }}, {{ pt.y }}<span v-if="idx < data.analysis.chin.basePoints.length - 1"> | </span>
                      </span>
                    </div>
                  </div>
                </div>
                <div class="result-actions" v-if="!data.analysis.chin?.completed">
                  <button class="secondary small disabled !w-full" v-if="!data.analysis.chin?.snapshot">
                    <font-awesome-icon icon="warning" fixed-width/>
                    Select
                    <strong v-if="selectionPoints">
                      <span v-if="selectionPoints.length === 0">left cheek (1/3)</span>
                      <span v-if="selectionPoints.length === 1">bottom of the chin (2/3)</span>
                      <span v-if="selectionPoints.length === 2">right cheek (3/3)</span>
                    </strong>
                  </button>
                  <button class="small" @click="confirmChin" v-if="!isLoading && data.analysis.chin?.snapshot">
                    Confirm
                    <font-awesome-icon icon="arrow-right" fixed-width/>
                  </button>
                </div>
              </div>

              <!-- EYES SECTION-->
              <div v-if="data.analysis?.eyes?.right && data.analysis.eyes?.left?.completed"
                   :class="['section', {'glowing': !manualMode && data.analysis.eyes?.left?.completed && !data.analysis.eyes?.right?.completed}]">
                <div class="result-text-item is-title">Right Eye</div>
                <div class="flex gap-5">
                  <div class="result-text-item">
                    <div class="attribute">Position</div>
                    <div class="value">
                      {{ data.analysis.eyes.right.position.x }}, {{ data.analysis.eyes.right.position.y }}
                    </div>
                  </div>
                  <div class="result-text-item">
                    <div class="attribute">Width & Height</div>
                    <div class="value">{{ data.analysis.eyes.right.width }}, {{ data.analysis.eyes.right.height }}</div>
                  </div>
                  <div class="result-text-item !flex-[1.5]">
                    <div class="attribute">Space between eyes</div>
                    <div class="value">{{ data.analysis.eyes?.spaceBetween ?? '-' }}</div>
                  </div>
                </div>
                <div class="result-actions"
                     v-if="!data.analysis.eyes?.right?.completed">
                  <button class="secondary small" @click="enableManualSelection('right_eye')" v-if="!isLoading">
                    <font-awesome-icon icon="warning" fixed-width/>
                    Manually change
                  </button>
                  <button class="small" @click="confirmRightEye" v-if="!isLoading">
                    Confirm
                    <font-awesome-icon icon="arrow-right" fixed-width/>
                  </button>
                </div>
              </div>

              <div v-if="data.analysis?.eyes?.left"
                   :class="['section', {'glowing': !manualMode && !data.analysis.eyes?.left?.completed}]">
                <div class="result-text-item is-title">Left Eye</div>
                <div class="flex gap-10">
                  <div class="result-text-item">
                    <div class="attribute">Position</div>
                    <div class="value">
                      {{ data.analysis.eyes.left.position.x }}, {{ data.analysis.eyes.left.position.y }}
                    </div>
                  </div>
                  <div class="result-text-item">
                    <div class="attribute">Width</div>
                    <div class="value">{{ data.analysis.eyes.left.width }}</div>
                  </div>
                  <div class="result-text-item">
                    <div class="attribute">Height</div>
                    <div class="value">{{ data.analysis.eyes.left.height }}</div>
                  </div>
                </div>
                <div class="result-actions"
                     v-if="!data.analysis.eyes?.left?.completed">
                  <button class="secondary small" @click="enableManualSelection('left_eye')" v-if="!isLoading">
                    <font-awesome-icon icon="warning" fixed-width/>
                    Manually change
                  </button>
                  <button class="small" @click="confirmLeftEye" v-if="!isLoading">
                    Confirm
                    <font-awesome-icon icon="arrow-right" fixed-width/>
                  </button>
                </div>
              </div>

              <!-- EARS SECTION-->
              <div
                  :class="['section', {'glowing': !manualMode && data.analysis.ears?.left?.completed && !data.analysis.ears.right.completed}]"
                  v-if="data.analysis?.ears?.left?.completed">
                <div class="result-text-item is-title">Right Ear</div>
                <div class="result-actions"
                     v-if="data.analysis?.ears?.right==='ERROR' && !!data.analysis.ears?.left?.completed">
                  <button class="small" @click="enableManualSelection('right_ear')" v-if="!isLoading">
                    Must select manually
                    <font-awesome-icon icon="arrow-right" fixed-width/>
                  </button>
                </div>
                <div class="flex gap-10" v-else-if="data.analysis?.ears?.right !== 'ERROR'">
                  <div class="result-text-item">
                    <div class="attribute">Position</div>
                    <div class="value">
                      {{ data.analysis.ears.right.position.x }}, {{ data.analysis.ears.right.position.y }}
                    </div>
                  </div>
                  <div class="result-text-item">
                    <div class="attribute">Width</div>
                    <div class="value">{{ data.analysis.ears.right.width }}</div>
                  </div>
                  <div class="result-text-item">
                    <div class="attribute">Height</div>
                    <div class="value">{{ data.analysis.ears.right.height }}</div>
                  </div>
                </div>
                <div class="result-actions"
                     v-if="data.analysis?.ears?.right !== 'ERROR' && data.analysis.ears?.left?.completed && !data.analysis.ears.right.completed">
                  <button class="secondary small" @click="enableManualSelection('right_ear')" v-if="!isLoading">
                    <font-awesome-icon icon="warning" fixed-width/>
                    Manually change
                  </button>
                  <button class="small" @click="confirmRightEar"
                          v-if="!isLoading && !data.analysis.ears.right.completed">
                    Confirm
                    <font-awesome-icon icon="arrow-right" fixed-width/>
                  </button>
                </div>
              </div>

              <div v-if="data.analysis?.ears?.left"
                   :class="['section', {'glowing': !manualMode && !data.analysis.ears?.left?.completed}]">
                <div class="result-text-item is-title">Left Ear</div>
                <div class="result-actions" v-if="data.analysis?.ears?.left === 'ERROR'">
                  <button class="small" @click="enableManualSelection('left_ear')" v-if="!isLoading">
                    Must select manually
                    <font-awesome-icon icon="arrow-right" fixed-width/>
                  </button>
                </div>
                <div class="flex gap-10" v-else>
                  <div class="result-text-item">
                    <div class="attribute">Position</div>
                    <div class="value">
                      {{ data.analysis.ears.left.position.x }}, {{ data.analysis.ears.left.position.y }}
                    </div>
                  </div>
                  <div class="result-text-item">
                    <div class="attribute">Width</div>
                    <div class="value">{{ data.analysis.ears.left.width }}</div>
                  </div>
                  <div class="result-text-item">
                    <div class="attribute">Height</div>
                    <div class="value">{{ data.analysis.ears.left.height }}</div>
                  </div>
                </div>
                <div class="result-actions"
                     v-if="data.analysis?.ears?.left !== 'ERROR' && !data.analysis.ears?.left?.completed">
                  <button class="secondary small" @click="enableManualSelection('left_ear')" v-if="!isLoading">
                    <font-awesome-icon icon="warning" fixed-width/>
                    Manually change
                  </button>
                  <button class="small" @click="confirmLeftEar" v-if="!isLoading">
                    Confirm
                    <font-awesome-icon icon="arrow-right" fixed-width/>
                  </button>
                </div>
              </div>

              <!-- TRANSFORMATION SECTION-->
              <div v-if="data.analysis?.rotation"
                   :class="['section', {'glowing': !manualMode && !data.analysis.rotation?.completed}]">
                <div class="result-text-item is-title">
                  <div class="text">Rotation and Scaling</div>
                </div>
                <div class="flex gap-6">
                  <div class="result-text-item">
                    <div class="attribute">Angle</div>
                    <div class="value">
                      {{
                        data.analysis.rotation.angle !== undefined ? data.analysis.rotation.angle.toFixed(2) : 'Processing'
                      }}
                    </div>
                  </div>
                </div>
                <div class="result-actions flex-wrap !gap-y-2"
                     v-if="data.analysis.rotation.angle && !data.analysis.rotation?.completed">
                  <div v-if="manualMode && manualSelectionType === 'rotation'"
                       class="flex basis-full items-center gap-3 mt-2">
                    <input type="range"
                           min="-180"
                           max="180"
                           step="1"
                           :value="manualRotationAngle"
                           @input="updateManualRotation($event.target.value)"/>

                    <input type="number"
                           min="-180"
                           max="180"
                           :value="manualRotationAngle"
                           @input="updateManualRotation($event.target.value)"/>
                  </div>

                  <button class="secondary small" @click="enableManualSelection('rotation')"
                          v-if="!isLoading && !manualMode">
                    <font-awesome-icon icon="rotate" fixed-width/>
                    Rotate manually
                  </button>
                  <button v-if="data.analysis?.nose === 'ERROR' && !isLoading" class="small"
                          @click="enableManualSelection('nose')">
                    <font-awesome-icon icon="warning" fixed-width/>
                    Must select nose manually
                  </button>
                  <button class="secondary small" @click="enableManualSelection('nose')"
                          v-else-if="!isLoading && !manualMode && manualSelectionType !== 'rotation'">
                    <font-awesome-icon icon="pencil" fixed-width/>
                    Change nose manually
                  </button>
                  <button class="small" @click="confirmTransformation"
                          v-if="!isLoading && manualMode && manualSelectionType === 'rotation'">
                    Confirm rotation
                  </button>
                  <button class="small" @click="handleEarsProcess"
                          v-if="!isLoading && !data.analysis?.ears && !manualMode && data.analysis?.nose !== 'ERROR'">
                    Continue analyses
                    <font-awesome-icon icon="arrow-right" fixed-width/>
                  </button>
                </div>
              </div>

              <!-- NOSE SECTION-->
              <div v-if="data.analysis?.nose"
                   :class="['section', {'glowing': !manualMode && !data.analysis.nose?.completed && !data.analysis.rotation}]">
                <div class="result-text-item is-title">
                  <div class="text">Nose</div>
                </div>
                <div class="result-actions"
                     v-if="data.analysis?.nose === 'ERROR' && !!data.analysis.nose?.completed">
                  <button class="small" @click="enableManualSelection('nose')" v-if="!isLoading">
                    Must select manually
                    <font-awesome-icon icon="arrow-right" fixed-width/>
                  </button>
                </div>
                <div class="flex gap-6" v-if="data.analysis?.nose !== 'ERROR'">
                  <div class="result-text-item">
                    <div class="attribute">Position</div>
                    <div class="value">{{ data.analysis.nose.position.x }}, {{ data.analysis.nose.position.y }}</div>
                  </div>
                  <div class="result-text-item">
                    <div class="attribute">Width</div>
                    <div class="value">{{ data.analysis.nose.width }}</div>
                  </div>
                  <div class="result-text-item">
                    <div class="attribute">Height</div>
                    <div class="value">{{ data.analysis.nose.height }}</div>
                  </div>
                </div>
                <div class="result-actions" v-if="!data.analysis.nose?.completed && !data.analysis.rotation">
                  <button class="secondary small" @click="enableManualSelection('nose')" v-if="!isLoading">
                    <font-awesome-icon icon="warning" fixed-width/>
                    Manually change
                  </button>
                  <button class="small" @click="handleRotation" v-if="!isLoading && !data.analysis?.rotation">
                    Continue analyses
                    <font-awesome-icon icon="arrow-right" fixed-width/>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-2 border-l pl-8 border-slate-100 flex-[1.2]">
            <div class="text-2xl font-bold flex gap-2 items-center">
              <span>Logs</span>
            </div>
            <div ref="logsRef" class="logs text-slate-500" v-if="data.logs.length > 0">
              <div v-for="(log, logIndex) in data.logs"
                   :key="logIndex"
                   @click="downloadSnapshot(log.snapshot, logIndex)"
                   @mouseover="data.currentSnapshot = log.snapshot"
                   @mouseleave="data.currentSnapshot = null"
                   :class="'item is-' + log.type">
                <font-awesome-icon v-if="log.snapshot" icon="image" fixed-width/>
                {{ log.message }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
import {computed, nextTick, ref} from 'vue';
import LayoutHeader from "../components/LayoutHeader.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import {Utils} from '../utils/fileUtils.js';
import cv from "opencv-ts";

export default {
  name: 'Analyzer',
  components: {LoadingSpinner, LayoutHeader},
  setup() {
    const data = ref(null);
    const canvasRef = ref(null);
    const isLoading = ref(false);
    const logsRef = ref(null);
    const originalImage = ref(null);
    const savedAnalyseId = ref(null);

    // Toggle state for JSON view
    const isJsonView = ref(false);

    const addLog = (message, type = 'info', snapshot = null) => {
      data.value.logs.push({
        message,
        type,
        snapshot,
      });

      if (snapshot) {
        data.value.currentSnapshot = snapshot
      }

      // Scroll to the latest log item after DOM updates
      nextTick(() => {
        if (logsRef.value) {
          logsRef.value.scrollTop = logsRef.value.scrollHeight;
        }
      });
    };

    const getStatus = computed(() => {
      return data.value?.logs.some(log => log.type === 'error') ? 'error' : 'success';
    });

    const onFileChange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const img = new Image();
      const reader = new FileReader();

      reader.onload = async (e) => {
        img.src = e.target.result;
      };

      img.onload = async () => {
        const maxDimension = 1024;
        let {width, height} = img;

        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(async (blob) => {
          const resizedFile = new File([blob], file.name, {type: 'image/jpeg'});
          await loadImage(resizedFile);
        }, 'image/jpeg', 0.7); // adjust quality as needed
      };

      reader.readAsDataURL(file);
    };

    const loadExampleImage = async () => {
      try {
        // const exampleImagePath = new URL('/src/assets/examples/2017-11 11.jpg', import.meta.url).href;
        // const exampleImagePath = new URL('/src/assets/examples/jupyter.png', import.meta.url).href;
        // const exampleImagePath = new URL('/src/assets/examples/oka.jpg', import.meta.url).href;
        const exampleImagePath = new URL('/src/assets/examples/lukas.jpg', import.meta.url).href;
        const img = new Image();
        const filename = exampleImagePath.split('/').pop().split('.').shift();

        img.onload = async () => {
          data.value = {
            file: null,
            filename: filename,
            analysis: {},
            logs: []
          };


          await nextTick();

          const canvasElement = canvasRef.value;
          if (canvasElement) {
            const context = canvasElement.getContext('2d');
            canvasElement.width = img.width;
            canvasElement.height = img.height;
            context.drawImage(img, 0, 0);
            originalImage.value = context.getImageData(0, 0, canvasElement.width, canvasElement.height);
            addLog("Example image loaded successfully", "success");
          } else {
            addLog("Canvas element not found", "error");
          }
        };

        img.onerror = () => {
          console.error("Error loading example image");
          addLog("Error loading example image", "error");
        };

        img.src = exampleImagePath;
      } catch (error) {
        console.error("Error loading example image:", error);
      }
    };

    const loadImage = async (file) => {
      originalImage.value = file;
      const img = new Image();

      img.onload = async () => {
        data.value = {
          file,
          filename: file.name.replace(/\.[^/.]+$/, ""),
          logs: [],
          analysis: {},
        };

        await nextTick();

        const canvasElement = canvasRef.value;
        if (canvasElement) {
          const context = canvasElement.getContext('2d');
          canvasElement.width = img.width;
          canvasElement.height = img.height;
          context.drawImage(img, 0, 0);
          originalImage.value = context.getImageData(0, 0, canvasElement.width, canvasElement.height);

          addLog("Image loaded successfully", "success");
        } else {
          addLog("Canvas element not found", "error");
        }
      };

      img.onerror = () => {
        console.error("Error loading image:", file.name);
        addLog("Error loading image", "error");
      };

      img.src = URL.createObjectURL(file);
    };

    const resetImage = async () => {
      return new Promise((resolve, reject) => {
        const canvasElement = canvasRef.value;
        const context = canvasElement.getContext('2d');

        // Clear the canvas
        context.clearRect(0, 0, canvasElement.width, canvasElement.height);

        if (originalImage.value) {
          // Create a temporary image element
          const tempImage = new Image();
          tempImage.onload = () => {
            // Draw the original image onto the canvas
            context.drawImage(tempImage, 0, 0, canvasElement.width, canvasElement.height);
            addLog('Canvas successfully reset to the original image', 'success', canvasElement.toDataURL());
            resolve(); // Resolve the promise when drawing is complete
          };

          tempImage.onerror = () => {
            addLog('Failed to load the original image', 'error');
            reject(new Error('Failed to load the original image'));
          };

          // Convert the ImageData to a data URL to set as the source for the temporary image
          const tempCanvas = document.createElement('canvas');
          const tempContext = tempCanvas.getContext('2d');
          tempCanvas.width = originalImage.value.width;
          tempCanvas.height = originalImage.value.height;
          tempContext.putImageData(originalImage.value, 0, 0);
          tempImage.src = tempCanvas.toDataURL();
        } else {
          addLog('Original image data not available', 'error');
          reject(new Error('Original image data not available'));
        }
      });
    };

    const resetToSnapshot = async (snapshot) => {
      if (!snapshot) {
        addLog('No snapshot available to reset', 'error');
        return;
      }

      return new Promise((resolve, reject) => {
        const canvasElement = canvasRef.value;
        if (!canvasElement) {
          addLog('Canvas element not available', 'error');
          reject(new Error('Canvas element not available'));
          return;
        }

        const context = canvasElement.getContext('2d');
        const src = cv.imread(canvasElement); // Read the canvas as an OpenCV Mat

        const tempImage = new Image();
        tempImage.onload = () => {
          context.clearRect(0, 0, canvasElement.width, canvasElement.height);
          canvasElement.width = tempImage.width;
          canvasElement.height = tempImage.height;
          context.drawImage(tempImage, 0, 0);

          // Update the currentSnapshot
          data.value.currentSnapshot = snapshot;
          addLog('Canvas reset to snapshot successfully', 'success', data.value.currentSnapshot);
          resolve();
        };

        tempImage.onerror = () => {
          addLog('Failed to load snapshot for canvas reset', 'error');
          reject(new Error('Failed to load snapshot'));
        };

        tempImage.src = snapshot;
        return src;
      });
    };

    const captureSnapshot = (mat) => {
      const tempCanvas = document.createElement('canvas');
      cv.imshow(tempCanvas, mat);
      return tempCanvas.toDataURL(); // Get the image as a base64 data URL
    };

    const handleProcess = async () => {
      isLoading.value = true;
      await startProcess();
      isLoading.value = false;
    }

    const nextFrame = () => {
      return new Promise(resolve => requestAnimationFrame(resolve));
    };

    const confirmTransformation = async () => {
      const canvasElement = canvasRef.value;
      const src = cv.imread(canvasElement);
      const newNoseData = await detectNose(src, true);
      newNoseData.completed = true;
      data.value.analysis.nose = newNoseData;
      if (data.value.analysis.nose !== 'ERROR') {
        data.value.analysis.nose.completed = true;
      }
      disableManualSelection();
      manualSelectionType.value = null;
    }

    const handleEarsProcess = async () => {
      data.value.analysis.rotation.completed = true;
      isLoading.value = true;
      try {
        const canvasElement = canvasRef.value;

        // save because rotation change
        const context = canvasElement.getContext('2d');
        originalImage.value = context.getImageData(0, 0, canvasElement.width, canvasElement.height);

        if (!canvasElement) {
          addLog("Canvas element not found", "error");
          return;
        }
        await nextFrame();

        const src = cv.imread(canvasElement); // Read the canvas as an OpenCV Mat

        await detectEars(src, data.value.analysis.nose);

        cv.imshow(canvasElement, src); // Show the modified image on the canvas
        src.delete();
      } catch (error) {
        console.error("Error while processing ears:", error);
        addLog("Error while processing ears", "error");
      }
      isLoading.value = false;
    }


    const handleEyesProcess = async () => {
      isLoading.value = true;
      try {
        const canvasElement = canvasRef.value;

        // save because rotation change
        const context = canvasElement.getContext('2d');
        originalImage.value = context.getImageData(0, 0, canvasElement.width, canvasElement.height);

        if (!canvasElement) {
          addLog("Canvas element not found", "error");
          return;
        }
        await nextFrame();

        const src = cv.imread(canvasElement); // Read the canvas as an OpenCV Mat

        await detectEyes(src);

        cv.imshow(canvasElement, src); // Show the modified image on the canvas
        src.delete();
      } catch (error) {
        console.error("Error while processing eyes:", error);
        addLog("Error while processing eyes", "error");
      }
      isLoading.value = false;
    }

    const startProcess = async () => {
      try {
        const canvasElement = canvasRef.value;
        if (!canvasElement) {
          addLog("Canvas element not found", "error");
          return;
        }
        await nextFrame();

        const src = cv.imread(canvasElement); // Read the canvas as an OpenCV Mat
        addLog("Image successfully loaded from canvas", "success");

        // Perform nose and ear detection
        data.value.analysis.nose = await detectNose(src);
        cv.imshow(canvasElement, src); // Show the modified image on the canvas
        src.delete();
      } catch (error) {
        console.error("Error processing the image:", error);
        addLog("Error processing the image", "error");
      }
    };

    const handleRotation = async () => {
      isLoading.value = true;
      data.value.analysis.nose.completed = true;
      data.value.analysis.rotation = {
        completed: false
      }

      rotateCanvasByNose();
      isLoading.value = false;
    }

    const drawNose = async (src, noseDetails) => {
      if (!noseDetails) return;

      cv.circle(
          src,
          new cv.Point(noseDetails.position.x, noseDetails.position.y),
          8,
          new cv.Scalar(255, 255, 0, 255),
          -1
      );

      // Draw the detected contour
      let contours = new cv.MatVector();
      const contoursToDraw = window._noseContour
      if (contoursToDraw) {
        contours.push_back(contoursToDraw);
        cv.drawContours(src, contours, 0, new cv.Scalar(0, 255, 0, 255), 2);
      }

      contours.delete();
      addLog('Nose is drawn on image:', 'info', captureSnapshot(src));
    };

    const detectNose = async (src, scaled = false) => {
      let noseDetails = null;
      addLog('Starting nose detection', 'headline', captureSnapshot(src));
      try {
        if (!src || src.empty()) {
          addLog("Error in detectNose: Source image is empty or undefined", 'error');
          return;
        }

        // Step 1: Convert from RGBA to RGB
        const rgbImg = new cv.Mat();
        cv.cvtColor(src, rgbImg, cv.COLOR_RGBA2RGB, 0);
        addLog("Converted from RGBA to RGB", 'info', captureSnapshot(rgbImg));
        await nextFrame();

        // Step 2: Convert the RGB image to HSV
        const hsvImg = new cv.Mat();
        cv.cvtColor(rgbImg, hsvImg, cv.COLOR_RGB2HSV, 0);
        addLog("Converted the RGB image to HSV", 'info', captureSnapshot(hsvImg));
        await nextFrame();

        // Step 3: Define multiple HSV ranges for nose detection (if the nose color might vary)
        const lowerNoseColor1 = new cv.Mat(hsvImg.rows, hsvImg.cols, hsvImg.type(), [0, 30, 80, 0]);
        const upperNoseColor1 = new cv.Mat(hsvImg.rows, hsvImg.cols, hsvImg.type(), [15, 255, 255, 0]);
        const lowerNoseColor2 = new cv.Mat(hsvImg.rows, hsvImg.cols, hsvImg.type(), [160, 30, 80, 0]);
        const upperNoseColor2 = new cv.Mat(hsvImg.rows, hsvImg.cols, hsvImg.type(), [179, 255, 255, 0]);

        // Step 4: Create a mask with the defined HSV range
        const noseMask1 = new cv.Mat();
        const noseMask2 = new cv.Mat();
        cv.inRange(hsvImg, lowerNoseColor1, upperNoseColor1, noseMask1);
        cv.inRange(hsvImg, lowerNoseColor2, upperNoseColor2, noseMask2);

        // Combine the two masks
        const noseMask = new cv.Mat();
        cv.add(noseMask1, noseMask2, noseMask);
        addLog("Created a combined mask with multiple HSV ranges", 'info', captureSnapshot(noseMask));
        await nextFrame();

        // Step 5: Apply morphological operations with a larger kernel to clean up the mask
        const kernelClose = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(7, 7));
        const kernelOpen = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
        cv.morphologyEx(noseMask, noseMask, cv.MORPH_CLOSE, kernelClose);
        cv.morphologyEx(noseMask, noseMask, cv.MORPH_OPEN, kernelOpen);

        addLog("Refined mask after morphological operations", 'info', captureSnapshot(noseMask));

        // Step 6: Find contours in the mask
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(noseMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        await nextFrame();

        if (contours.size() === 0) {
          addLog("No contours detected in refined mask", 'error');
          return;
        } else {
          addLog(contours.size() + " contours detected", 'info');
        }

        // Define middle-upper region coordinates
        const imageHeight = src.rows;
        const imageWidth = src.cols;

        // pick different area if image is scaled
        const middleUpperRegion = scaled ? {
          x: imageWidth * 0.2,
          y: imageHeight * 0.3,
          width: imageWidth * 0.6,
          height: imageHeight * 0.6
        } : {
          x: imageWidth * 0.2,
          y: imageHeight * 0.1,
          width: imageWidth * 0.6,
          height: imageHeight * 0.6
        };

        await nextFrame();

        // Log and visualize the middle-upper region
        const regionSnapshot = src.clone();
        cv.rectangle(
            regionSnapshot,
            new cv.Point(middleUpperRegion.x, middleUpperRegion.y),
            new cv.Point(middleUpperRegion.x + middleUpperRegion.width, middleUpperRegion.y + middleUpperRegion.height),
            new cv.Scalar(255, 0, 0, 255),
            2
        );
        addLog(`Middle-upper region position`, 'info', captureSnapshot(regionSnapshot));
        regionSnapshot.delete();
        await nextFrame();

        // Step 7: Select the most likely contour based on area, position, and aspect ratio
        let maxArea = 0;
        let noseContourIndex = -1;

        for (let i = 0; i < contours.size(); i++) {
          const contour = contours.get(i);
          const area = cv.contourArea(contour);

          // Skip small noise contours
          if (area < 100) continue;

          const rect = cv.boundingRect(contour);
          const aspectRatio = rect.width / rect.height;

          // Position Constraint: Check if the contour is in the middle-upper region (approximate nose location)
          const isInMiddleUpperRegion = rect.y >= middleUpperRegion.y &&
              rect.y + rect.height <= middleUpperRegion.y + middleUpperRegion.height &&
              rect.x >= middleUpperRegion.x &&
              rect.x + rect.width <= middleUpperRegion.x + middleUpperRegion.width;

          const isValidSize = area > 100 && area < 2600;

          const isValidAspectRatio = aspectRatio > 0.5 && aspectRatio < 1.5;

          // Draw the contour temporarily on a clone for logging purposes
          const contourSnapshot = src.clone();
          cv.drawContours(contourSnapshot, contours, i, new cv.Scalar(0, 255, 0, 255), 2);

          if (isInMiddleUpperRegion && isValidAspectRatio && isValidSize) {
            // Capture a snapshot of the candidate contour for the log
            addLog(`Found potential nose contour - Area: ${area}, Aspect Ratio: ${aspectRatio}`, 'info', captureSnapshot(contourSnapshot));

            // Check if this is the largest suitable contour found so far
            if (area > maxArea) {
              maxArea = area;
              noseContourIndex = i;
            }

            // Clean up the temporary clone
            contourSnapshot.delete();
          } else {
            // Log reasons why the contour was rejected
            if (!isInMiddleUpperRegion) {
              addLog(`Contour rejected: Not in middle upper region`, 'info', captureSnapshot(contourSnapshot));
            } else if (!isValidSize) {
              addLog(`Contour rejected: Invalid size - Area: ${area}`, 'info', captureSnapshot(contourSnapshot));
            } else if (!isValidAspectRatio) {
              addLog(`Contour rejected: Invalid aspect ratio`, 'info', captureSnapshot(contourSnapshot));
            }
          }
          await nextFrame();
        }

        if (noseContourIndex === -1) {
          addLog("No suitable contour found for the nose", 'error');
          noseDetails = 'ERROR';
          isLoading.value = false;
        } else {
          // Step 8: Calculate and log nose center and rotation
          const noseContour = contours.get(noseContourIndex);
          const boundingRect = cv.boundingRect(noseContour);
          const noseCenter = {
            x: boundingRect.x + boundingRect.width / 2,
            y: boundingRect.y + boundingRect.height / 2
          };
          const noseWidth = boundingRect.width;
          const noseHeight = boundingRect.height;

          window._noseContour = noseContour;
          noseDetails = {
            position: noseCenter,
            width: noseWidth,
            height: noseHeight,
            contour: noseContour
          };

          // Refined top and bottom point detection using top 10% of points with lowest y and selecting the one closest to the median X
          const points = [];
          for (let i = 0; i < noseContour.rows; i++) {
            const x = noseContour.data32S[i * 2];
            const y = noseContour.data32S[i * 2 + 1];
            points.push({x, y});
          }
          const topPoint = points.reduce((highest, p) => (p.y < highest.y ? p : highest), points[0]);
          const bottomPoint = points.reduce((lowest, p) => (p.y > lowest.y ? p : lowest), points[0]);

          // Draw the top and bottom points
          if (topPoint && bottomPoint) {
            cv.circle(src, new cv.Point(topPoint.x, topPoint.y), 8, new cv.Scalar(255, 255, 0, 255), -1);
            cv.circle(src, new cv.Point(bottomPoint.x, bottomPoint.y), 8, new cv.Scalar(0, 255, 255, 255), -1);
            addLog("Marked top and bottom points of the nose", "info", captureSnapshot(src));
          }

          noseDetails.topPoint = topPoint;
          noseDetails.bottomPoint = bottomPoint;

          // Also store them inside noseDetails
          noseDetails.angle = getRotationByNose(noseDetails);

          addLog(`Nose found! Center: (${noseCenter.x}, ${noseCenter.y})`, 'success', captureSnapshot(src));

          // Draw key points
          await drawNose(src, noseDetails);

          noseDetails.snapshot = captureSnapshot(src);
        }

        // Draw the detected contour
        await nextFrame();

        // Cleanup
        rgbImg.delete();
        hsvImg.delete();
        lowerNoseColor1.delete();
        upperNoseColor1.delete();
        lowerNoseColor2.delete();
        upperNoseColor2.delete();
        noseMask1.delete();
        noseMask2.delete();
        noseMask.delete();
        hierarchy.delete();
        contours.delete();
        data.value.currentSnapshot = noseDetails.snapshot
      } catch (error) {
        console.error("Error in detectNose: ", error);
        addLog("Error in detectNose", 'error');
      }
      addLog("returning", 'error');
      return noseDetails
    };

    const getRotationByNose = (noseDetails) => {
      const topPoint = noseDetails.topPoint;
      const bottomPoint = noseDetails.bottomPoint;

      // Compute angle between top and bottom points (nose rotation)
      const deltaX = bottomPoint.x - topPoint.x;
      const deltaY = bottomPoint.y - topPoint.y;
      const angleRad = Math.atan2(deltaY, deltaX);
      const angleDeg = angleRad * (180 / Math.PI) + 8;
      addLog(`Stupeň rotácie (z top-bottom nosa): ${angleDeg.toFixed(2)}°`, 'info');
      return angleDeg
    }

    const drawEar = async (src, earDetails, leftRight) => {
      if (!earDetails) return;

      // Draw the detected contour
      let contours = new cv.MatVector();
      let earContour = earDetails.contour
      if (leftRight === 'left') {
        earContour = window._earsContour.left
      } else if (leftRight === 'right') {
        earContour = window._earsContour.right
      }
      if (earContour) {
        contours.push_back(earContour);
        cv.drawContours(src, contours, -1, new cv.Scalar(255, 0, 0, 255), 2);
      }

      contours.delete();
      addLog("Ear is drawn on the image.", "info", captureSnapshot(src));
    };

    const drawEye = async (leftRight, src) => {
      const canvasElement = canvasRef.value;
      if (!src) {
        src = cv.imread(canvasElement);
      }

      // Draw the detected contour
      let contours = new cv.MatVector();
      let partContour;
      if (leftRight === 'left') {
        partContour = window._eyesContour.left
      } else if (leftRight === 'right') {
        partContour = window._eyesContour.right
      }
      if (partContour) {
        contours.push_back(partContour);

        // Draw green contour
        cv.drawContours(src, contours, -1, new cv.Scalar(0, 255, 0, 255), 2);

        // Compute hull to extract points
        const hull = new cv.Mat();
        cv.convexHull(partContour, hull, false);

        let points = [];
        for (let j = 0; j < hull.rows; j++) {
          points.push({x: hull.data32S[j * 2], y: hull.data32S[j * 2 + 1]});
        }

        let bestPair = [points[0], points[1]];
        if (points.length >= 2) {
          let maxDist = 0;
          for (let a = 0; a < points.length; a++) {
            for (let b = a + 1; b < points.length; b++) {
              const dx = points[a].x - points[b].x;
              const dy = points[a].y - points[b].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > maxDist) {
                maxDist = dist;
                bestPair = [points[a], points[b]];
              }
            }
          }

          cv.line(
              src,
              new cv.Point(bestPair[0].x, bestPair[0].y),
              new cv.Point(bestPair[1].x, bestPair[1].y),
              new cv.Scalar(0, 0, 255, 255),
              2
          );
        }

        hull.delete();
      }

      contours.delete();
      addLog("Eye is drawn on the image (" + leftRight + ")", "info", captureSnapshot(src));
    };

    const confirmLeftEye = async () => {
      if (!data.value.analysis.eyes.left) {
        addLog("Left eye data is not available", "error");
        return;
      }

      data.value.analysis.eyes.left.completed = true;
      await resetToSnapshot(data.value.analysis.eyes.left.snapshot)

      drawEye('right');
    };

    const confirmRightEye = async () => {
      if (!data.value.analysis.eyes.right) {
        addLog("Right eye data is not available", "error");
        return;
      }

      data.value.analysis.eyes.right.completed = true;
      await resetToSnapshot(data.value.analysis.eyes.left.snapshot)

      const canvasElement = canvasRef.value;
      const src = cv.imread(canvasElement);
      await drawEye('right', src);
      data.value.analysis.eyes.right.snapshot = captureSnapshot(src);
      await resetToSnapshot(data.value.analysis.eyes.right.snapshot)

      detectChin(src)
    };

    const confirmChin = async () => {
      data.value.analysis.chin.completed = true;
      await resetToSnapshot(data.value.analysis.eyes.right.snapshot)

      const canvasElement = canvasRef.value;
      const src = cv.imread(canvasElement);
      await drawChin(src);
      data.value.analysis.chin.snapshot = captureSnapshot(src);
      await resetToSnapshot(data.value.analysis.chin.snapshot)

      addLog("Analysis completed.", "success")
      addLog("Sending data to process.", "info")
      saveAnalyse();
    };

    const saveAnalyse = async () => {
      if (!data.value?.analysis) {
        addLog("No analysis data available to save.", "error");
        return;
      }
      isLoading.value = true;


      try {
        const payload = JSON.parse(JSON.stringify(data.value.analysis));

        // Remove unwanted keys
        const cleanPayload = (obj) => {
          for (const key in obj) {
            if (key === 'contour' || key === 'snapshot' || key === 'completed') {
              delete obj[key];
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
              cleanPayload(obj[key]);
            }
          }
        };

        cleanPayload(payload);

        const {getStorage, ref, uploadString, getDownloadURL} = await import("firebase/storage");
        const storage = getStorage();

        const canvasElement = canvasRef.value;
        const originalSnapshot = canvasElement.toDataURL(); // final processed snapshot
        let originalImageDataUrl = null;
        if (data.value.file instanceof File) {
          originalImageDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(data.value.file);
          });
        } else {
          addLog("Original file not available for upload. Expected this to be example, so skipping saving.", "success");
          isLoading.value = false;
          return
        }

        const timestamp = Date.now();
        const basePath = `analysesCats/${data.value.filename}-${timestamp}`;

        if (originalImageDataUrl) {
          const originalRef = ref(storage, `${basePath}-original.png`);
          await uploadString(originalRef, originalImageDataUrl, "data_url");
          const originalUrl = await getDownloadURL(originalRef);
          payload.originalImageUrl = originalUrl;
        }
        const processedRef = ref(storage, `${basePath}-processed.png`);
        await uploadString(processedRef, originalSnapshot, "data_url");
        const processedUrl = await getDownloadURL(processedRef);
        payload.processedImageUrl = processedUrl;

        // Import Firebase and get Firestore reference
        const {getFirestore, collection, addDoc, serverTimestamp} = await import('firebase/firestore');
        const db = getFirestore();

        const docRef = await addDoc(collection(db, "analyses"), {
          ...payload,
          createdAt: serverTimestamp()
        });
        savedAnalyseId.value = docRef.id;

        addLog("Analysis data saved to Firebase.", "success");
      } catch (error) {
        console.error("Error saving analysis:", error);
        addLog("Failed to save analysis data.", "error");
      }
      isLoading.value = false;
    };

    const detectEyes = async (src) => {
      addLog('Eyes detection started', 'headline', captureSnapshot(src));

      if (!src || src.empty()) {
        addLog("Source image is empty or undefined", 'error');
        return;
      }

      const hsv = new cv.Mat();
      cv.cvtColor(src, hsv, cv.COLOR_RGB2HSV);

      const lowerBlue = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [60, 10, 10, 0]);
      const upperBlue = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [120, 255, 255, 0]);
      const mask = new cv.Mat();
      cv.inRange(hsv, lowerBlue, upperBlue, mask);

      const kernel = cv.Mat.ones(7, 7, cv.CV_8U);
      cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);
      cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel);

      addLog("Mask for eyes created and cleaned", "info", captureSnapshot(mask));

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      if (contours.size() === 0) {
        addLog("No eye contours detected", "error");
        return;
      }

      addLog(`Found ${contours.size()} contours for eyes`, "info");

      let eyeContours = [];
      for (let i = 0; i < contours.size(); i++) {
        const c = contours.get(i);
        const rect = cv.boundingRect(c);
        const area = cv.contourArea(c);
        eyeContours.push({contour: c, x: rect.x, y: rect.y, area, rect});
      }

      eyeContours.sort((a, b) => a.x - b.x);

      let bestPair = null;
      let bestScore = 0;

      for (let i = 0; i < eyeContours.length - 1; i++) {
        for (let j = i + 1; j < eyeContours.length; j++) {
          const a = eyeContours[i];
          const b = eyeContours[j];
          const areaRatio = Math.min(a.area, b.area) / Math.max(a.area, b.area);
          const yDiff = Math.abs(a.y - b.y);
          const score = areaRatio / (1 + yDiff); // jednoduché skóre

          if (score > bestScore) {
            bestScore = score;
            bestPair = [a, b];
          }
        }
      }

      if (!bestPair) {
        addLog("Could not find a symmetric eye pair for " + eyeContours.length + " candidates", "error");
        return;
      }

      const [leftEye, rightEye] = bestPair[0].x < bestPair[1].x ? bestPair : [bestPair[1], bestPair[0]];

      // Add calculation of space between eyes
      const leftEyeRight = leftEye.x + leftEye.rect.width;
      const rightEyeLeft = rightEye.x;
      const spaceBetween = Math.floor(Math.abs(rightEyeLeft - leftEyeRight));

      window._eyesContour = {};

      const processEye = (eye, label) => {
        const hull = new cv.Mat();
        cv.convexHull(eye.contour, hull, false);

        let points = [];
        for (let j = 0; j < hull.rows; j++) {
          points.push({x: hull.data32S[j * 2], y: hull.data32S[j * 2 + 1]});
        }

        let bestPair = [points[0], points[1]];
        if (points.length >= 2) {
          let maxDist = 0;
          for (let a = 0; a < points.length; a++) {
            for (let b = a + 1; b < points.length; b++) {
              const dx = points[a].x - points[b].x;
              const dy = points[a].y - points[b].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > maxDist) {
                maxDist = dist;
                bestPair = [points[a], points[b]];
              }
            }
          }

          const diagImg = src.clone();
          const matVec = new cv.MatVector();
          matVec.push_back(eye.contour);

          // draw only left eye for checking only left first
          if (label.toLowerCase() === 'left') {
            cv.drawContours(diagImg, matVec, -1, new cv.Scalar(0, 255, 0, 255), 2);
            cv.line(diagImg, new cv.Point(bestPair[0].x, bestPair[0].y), new cv.Point(bestPair[1].x, bestPair[1].y), new cv.Scalar(0, 0, 255, 255), 2);
            addLog(`${label} eye: drawn contour & longest diagonal`, "info", captureSnapshot(diagImg));
          }

          if (!data.value.analysis.eyes) data.value.analysis.eyes = {};
          data.value.analysis.eyes[label.toLowerCase()] = {
            position: {
              x: Math.floor((bestPair[0].x + bestPair[1].x) / 2),
              y: Math.floor((bestPair[0].y + bestPair[1].y) / 2),
            },
            width: Math.floor(Math.abs(bestPair[0].x - bestPair[1].x)),
            height: Math.floor(Math.abs(bestPair[0].y - bestPair[1].y)),
            snapshot: captureSnapshot(diagImg),
            completed: false
          };

          if (label.toLowerCase() === 'left') {
            window._eyesContour.left = eye.contour;
            data.value.currentSnapshot = captureSnapshot(diagImg)
          } else {
            window._eyesContour.right = eye.contour;
          }

          diagImg.delete();
          matVec.delete();
        }

        hull.delete();
      };

      processEye(leftEye, 'Left');
      processEye(rightEye, 'Right');

      data.value.analysis.eyes.spaceBetween = spaceBetween;

      hsv.delete();
      lowerBlue.delete();
      upperBlue.delete();
      mask.delete();
      contours.delete();
      hierarchy.delete();
      kernel.delete();
    };

    const detectChin = async (src) => {
      addLog("Starting manual chin detection", "headline", captureSnapshot(src));

      manualMode.value = true;
      manualSelectionType.value = 'chin';
      selectionPoints.value = [];
      data.value.analysis.chin = {completed: false}
      addLog("Please select 3 points: left cheek, bottom chin, right cheek", "info");
    };

    const drawChin = async (src) => {
      if (!data.value.analysis.chin || !data.value.analysis.chin.coefficients) {
        addLog("No chin coefficients available", "error");
        return;
      }

      const {a, b, c} = data.value.analysis.chin.coefficients;

      const canvasElement = canvasRef.value;
      if (!canvasElement) {
        addLog("Canvas element not found", "error");
        return;
      }

      if (!src) {
        src = cv.imread(canvasElement);
      }

      const width = canvasElement.width;
      const lspace = Array.from({length: 100}, (_, i) => i * width / 100);
      const drawPoints = lspace.map(xVal => {
        const yVal = a * xVal * xVal + b * xVal + c;
        return new cv.Point(Math.round(xVal), Math.round(yVal));
      });

      const polyPoints = cv.matFromArray(drawPoints.length, 1, cv.CV_32SC2, drawPoints.flatMap(p => [p.x, p.y]));
      const polyVec = new cv.MatVector();
      polyVec.push_back(polyPoints);

      cv.polylines(src, polyVec, false, new cv.Scalar(0, 255, 255, 255), 2);
      addLog("Parabola for chin drawn", "success", captureSnapshot(src));
      data.value.currentSnapshot = captureSnapshot(src)

      polyVec.delete();
      polyPoints.delete();
    };

    const detectEars = async (src, noseDetails) => {
      const noseCenter = noseDetails.position;
      const noseWidth = noseDetails.width;
      const noseHeight = noseDetails.height;

      let earsDetails = {};
      addLog('Ears detection started', 'headline');
      try {
        if (!src || src.empty()) {
          addLog("Error in detectEars: Source image is empty or undefined", 'error');
          return;
        }

        const imageWidth = src.cols;

        const leftEarRegion = {
          x: Math.max(0, noseCenter.x - (5 * noseWidth)), // Move further left
          y: Math.max(0, noseCenter.y - (7 * noseHeight)), // Move higher above the nose
          width: 4 * noseWidth, // Wider to capture the ear
          height: 3 * noseHeight, // Increased height
        };

        const rightEarRegion = {
          x: Math.min(imageWidth - 1, noseCenter.x + noseWidth), // Move further right
          y: Math.max(0, noseCenter.y - (7 * noseHeight)), // Move higher above the nose
          width: 4 * noseWidth, // Wider to capture the ear
          height: 3 * noseHeight, // Increased height
        };
        await nextFrame();

        // Visualize ear regions for debugging
        const earRegionSnapshot = src.clone();
        cv.rectangle(
            earRegionSnapshot,
            new cv.Point(leftEarRegion.x, leftEarRegion.y),
            new cv.Point(leftEarRegion.x + leftEarRegion.width, leftEarRegion.y + leftEarRegion.height),
            new cv.Scalar(255, 0, 0, 255), // Blue for left ear region
            2
        );
        cv.rectangle(
            earRegionSnapshot,
            new cv.Point(rightEarRegion.x, rightEarRegion.y),
            new cv.Point(rightEarRegion.x + rightEarRegion.width, rightEarRegion.y + rightEarRegion.height),
            new cv.Scalar(0, 255, 0, 255), // Green for right ear region
            2
        );
        addLog('Visualized left and right ear regions', 'info', captureSnapshot(earRegionSnapshot));
        earRegionSnapshot.delete();
        await nextFrame();

        // Step 1: Convert to grayscale and apply edge detection
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        const blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
        const edges = new cv.Mat();
        cv.Canny(blurred, edges, 50, 150);
        addLog("Applied edge detection", 'info', captureSnapshot(edges));

        // Step 2: Find contours
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        addLog(`Contours found: ${contours.size()}`, 'info');
        await nextFrame();

        let maxLeftArea = 0;
        let maxRightArea = 0;
        let leftEarContourIndex = -1;
        let rightEarContourIndex = -1;

        // Step 3: Analyze contours
        for (let i = 0; i < contours.size(); i++) {
          const contour = contours.get(i);
          const area = cv.contourArea(contour);
          const rect = cv.boundingRect(contour);
          const aspectRatio = rect.width / rect.height;

          // Convex hull and solidity calculation
          const hull = new cv.Mat();
          cv.convexHull(contour, hull, false);
          const hullArea = cv.contourArea(hull);
          const solidity = hullArea > 0 ? area / hullArea : 0;

          // Filter: Size, aspect ratio, and solidity
          const isValidSize = area > 40 && area < 1500;
          const isValidAspectRatio = aspectRatio > 0.3 && aspectRatio < 2;
          const isValidSolidity = (area > 200 && solidity > 0.5 && solidity < 0.9) || (area <= 200 && solidity > 0.01);

          // Check if the contour is within the left ear region
          const isInLeftRegion =
              rect.x >= leftEarRegion.x &&
              rect.x + rect.width <= leftEarRegion.x + leftEarRegion.width &&
              rect.y >= leftEarRegion.y &&
              rect.y + rect.height <= leftEarRegion.y + leftEarRegion.height;

          // Check if the contour is within the right ear region
          const isInRightRegion =
              rect.x >= rightEarRegion.x &&
              rect.x + rect.width <= rightEarRegion.x + rightEarRegion.width &&
              rect.y >= rightEarRegion.y &&
              rect.y + rect.height <= rightEarRegion.y + rightEarRegion.height;

          // Visualize the current contour and its hull
          const contourSnapshot = src.clone();
          const hullContours = new cv.MatVector();
          hullContours.push_back(hull);
          const hullSnapshot = src.clone();
          cv.drawContours(hullSnapshot, hullContours, 0, new cv.Scalar(0, 0, 255, 255), 2); // Red for convex hull
          addLog(`Visualizing Convex Hull`, 'info', captureSnapshot(hullSnapshot));
          await nextFrame();
          hullSnapshot.delete();
          addLog(
              `Contour analysis: Area: ${area}, Aspect Ratio: ${aspectRatio}, Solidity: ${solidity}`,
              'info',
              captureSnapshot(contourSnapshot)
          );
          contourSnapshot.delete();
          hullContours.delete();

          // Left ear evaluation
          if (!isValidSize) {
            addLog('Refused because isValidSize');
          }
          if (!isValidAspectRatio) {
            addLog('Refused because isValidAspectRatio');
          }
          if (!isInLeftRegion) {
            addLog('Refused because isInLeftRegion');
          }
          if (!isValidSolidity) {
            addLog('Refused because isValidSolidity');
          }

          if (isValidSize && isValidAspectRatio && isValidSolidity && isInLeftRegion) {
            if (area > maxLeftArea) {
              maxLeftArea = area;
              leftEarContourIndex = i;
            }
          }

          if (isValidSize && isValidAspectRatio && isValidSolidity && isInRightRegion) {
            if (area > maxRightArea) {
              maxRightArea = area;
              rightEarContourIndex = i;
            }
          }

          hull.delete();
        }

        // Step 4: Draw detected ears
        window._earsContour = {}
        if (leftEarContourIndex !== -1) {
          addLog('Left ear detected and highlighted', 'success', captureSnapshot(src));
          earsDetails.left = {
            position: {
              x: leftEarRegion.x,
              y: leftEarRegion.y,
            },
            width: leftEarRegion.width,
            height: leftEarRegion.height,
            contour: contours.get(leftEarContourIndex)
          }
          window._earsContour.left = earsDetails.left.contour;
          await drawNose(src, data.value.analysis.nose);
          await drawEar(src, earsDetails.left, 'left');
          earsDetails.left.snapshot = captureSnapshot(src);
        } else {
          addLog('Left ear not detected', 'error');
          earsDetails.left = 'ERROR';
        }

        if (rightEarContourIndex !== -1) {
          addLog('Right ear detected and highlighted', 'success', captureSnapshot(src));
          earsDetails.right = {
            position: {
              x: rightEarRegion.x,
              y: rightEarRegion.y,
            },
            width: rightEarRegion.width,
            height: rightEarRegion.height,
            contour: contours.get(rightEarContourIndex)
          }
          window._earsContour.right = earsDetails.right.contour;
          await drawNose(src, data.value.analysis.nose);
          await drawEar(src, earsDetails.right, 'right');
          earsDetails.right.snapshot = captureSnapshot(src);
        } else {
          addLog('Right ear not detected', 'error');
          earsDetails.right = 'ERROR';
        }

        await nextFrame();

        // Cleanup
        gray.delete();
        blurred.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();
      } catch (error) {
        console.error("Error in detectEars: ", error);
        addLog("Error in detectEars", 'error');
      }

      data.value.analysis.ears = earsDetails;
    };

    // Manual selection
    const selectionPoints = ref([]);
    const manualMode = ref(false);
    const manualSelectionType = ref(null);

    const enableManualSelection = (type) => {
      manualMode.value = true;
      selectionPoints.value = [];
      manualSelectionType.value = type
      if (type === 'rotation') {
        addLog("Manual rotation enabled. Click to rotate image clockwise by 5°.", "info");
      } else {
        addLog("Manual selection mode enabled. Click to add points and form a polygon.", "info");
      }
    };

    const disableManualSelection = () => {
      manualMode.value = false;
      selectionPoints.value = [];
    };

    const onCanvasClick = (event) => {
      if (!manualMode.value) return;

      const canvasElement = canvasRef.value;
      if (!canvasElement) return;

      const rect = canvasElement.getBoundingClientRect(); // Get the canvas position and size
      const scaleX = canvasElement.width / rect.width; // Horizontal scaling factor
      const scaleY = canvasElement.height / rect.height; // Vertical scaling factor

      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;

      // Add the clicked point to the selectionPoints array
      selectionPoints.value.push({x, y});

      // Automatically finish chin selection after 3 points
      if (manualSelectionType.value === 'chin' && selectionPoints.value.length === 3) {
        processManualSelection(selectionPoints);
        disableManualSelection();
        return;
      }

      // Check if the user clicked near the first point to close the polygon
      if (
          selectionPoints.value.length > 2 &&
          Math.abs(x - selectionPoints.value[0].x) < 10 &&
          Math.abs(y - selectionPoints.value[0].y) < 10
      ) {
        selectionPoints.value.push(selectionPoints.value[0]); // Close the polygon
        processManualSelection(selectionPoints);
        disableManualSelection();
        return;
      }

      redrawCanvasWithSelection();
    };

    const redrawCanvasWithSelection = () => {
      const canvasElement = canvasRef.value;
      if (!canvasElement) return;

      const context = canvasElement.getContext('2d');

      // Clear the canvas
      context.clearRect(0, 0, canvasElement.width, canvasElement.height);

      // Ensure the original image is redrawn
      if (originalImage.value) {
        const tempCanvas = document.createElement('canvas');
        const tempContext = tempCanvas.getContext('2d');
        tempCanvas.width = originalImage.value.width;
        tempCanvas.height = originalImage.value.height;
        tempContext.putImageData(originalImage.value, 0, 0);

        const img = new Image();
        img.onload = () => {
          context.drawImage(img, 0, 0);

          // Draw the polygon if there are selection points
          if (selectionPoints.value.length > 0) {
            context.beginPath();
            context.moveTo(selectionPoints.value[0].x, selectionPoints.value[0].y);

            // Draw lines between consecutive points only
            for (let i = 1; i < selectionPoints.value.length; i++) {
              const point = selectionPoints.value[i];
              context.lineTo(point.x, point.y);
            }

            context.strokeStyle = 'red';
            context.lineWidth = 2;
            context.stroke();

            // Draw small circles on each point
            selectionPoints.value.forEach((point) => {
              context.beginPath();
              context.arc(point.x, point.y, 5, 0, 2 * Math.PI);
              context.fillStyle = 'blue';
              context.fill();
            });
          }
        };

        // Set the source of the temporary canvas as the image source
        img.src = tempCanvas.toDataURL();
      } else {
        addLog('Original image data not available for redraw', 'error');
      }
    };

    const processManualSelection = async (selectionPoints) => {
      if (selectionPoints.value.length < 3) {
        addLog("Selection is invalid, a polygon requires at least 3 points.", "error");
        return;
      }

      const minX = Math.min(...selectionPoints.value.map((p) => p.x));
      const minY = Math.min(...selectionPoints.value.map((p) => p.y));
      const maxX = Math.max(...selectionPoints.value.map((p) => p.x));
      const maxY = Math.max(...selectionPoints.value.map((p) => p.y));

      // Prepare OpenCV Mat for drawing
      const canvasElement = canvasRef.value;
      let src = cv.imread(canvasElement);

      // Create the contour as a cv.Mat
      const contour = new cv.Mat(selectionPoints.value.length, 1, cv.CV_32SC2);
      for (let i = 0; i < selectionPoints.value.length; i++) {
        contour.data32S[i * 2] = Math.round(selectionPoints.value[i].x);
        contour.data32S[i * 2 + 1] = Math.round(selectionPoints.value[i].y);
      }

      let details = {
        position: {
          x: Math.floor(minX + (maxX - minX) / 2),
          y: Math.floor(minY + (maxY - minY) / 2),
        },
        width: Math.floor(maxX - minX),
        height: Math.floor(maxY - minY),
        contour: contour,
      };

      if (manualSelectionType.value === "nose") {
        await resetImage();

        const points = [];
        for (let i = 0; i < contour.rows; i++) {
          const x = contour.data32S[i * 2];
          const y = contour.data32S[i * 2 + 1];
          points.push({x, y});
        }

        const topPoint = points.reduce((highest, p) => (p.y < highest.y ? p : highest), points[0]);
        const bottomPoint = points.reduce((lowest, p) => (p.y > lowest.y ? p : lowest), points[0]);

        details.topPoint = topPoint;
        details.bottomPoint = bottomPoint;

        data.value.analysis.nose = details;
        details.angle = getRotationByNose(details);

        window._noseContour = contour.clone();
        src = cv.imread(canvasElement);
        await drawNose(src, details);
        details.snapshot = captureSnapshot(src);
      } else if (manualSelectionType.value === "chin") {
        if (selectionPoints.value.length !== 3) {
          addLog("Chin detection requires exactly 3 points (left cheek, chin, right cheek)", "error");
          return;
        }

        const chinPoints = [...selectionPoints.value];
        const x = chinPoints.map(p => p.x);
        const y = chinPoints.map(p => p.y);

        const z = cv.matFromArray(3, 1, cv.CV_64F, y);
        const matX = cv.matFromArray(3, 3, cv.CV_64F, [
          x[0] * x[0], x[0], 1,
          x[1] * x[1], x[1], 1,
          x[2] * x[2], x[2], 1,
        ]);

        const coeffs = new cv.Mat();
        cv.solve(matX, z, coeffs, cv.DECOMP_SVD);

        const a = coeffs.data64F[0];
        const b = coeffs.data64F[1];
        const c = coeffs.data64F[2];

        data.value.analysis.chin = {
          coefficients: {a, b, c},
          basePoints: chinPoints,
          completed: false,
        };

        await resetImage()
        const canvasElement = canvasRef.value;
        src = cv.imread(canvasElement);
        await drawChin(src);
        addLog("Manual chin curve drawn", "success", captureSnapshot(src));
        data.value.analysis.chin.snapshot = captureSnapshot(src);

        coeffs.delete();
        z.delete();
        matX.delete();
      } else if (manualSelectionType.value === "left_ear" || manualSelectionType.value === "right_ear") {
        if (manualSelectionType.value === "left_ear") {
          await resetToSnapshot(data.value.analysis.rotation.snapshot);
        } else if (manualSelectionType.value === "right_ear") {
          await resetToSnapshot(data.value.analysis.ears.left.snapshot);
        }
        src = cv.imread(canvasElement);

        addLog("picture after resetting, but before ear", 'info', captureSnapshot(src))
        await drawEar(src, details);
      } else {
        if (manualSelectionType.value === "left_eye") {
          await resetToSnapshot(data.value.analysis.ears.right.snapshot);
        } else if (manualSelectionType.value === "right_eye") {
          await resetToSnapshot(data.value.analysis.eyes.left.snapshot);
        }
        src = cv.imread(canvasElement);

        addLog("picture after resetting, but before eye", 'info', captureSnapshot(src))
        if (manualSelectionType.value === "left_eye") {
          data.value.analysis.eyes = data.value.analysis.eyes || {};
          data.value.analysis.eyes.left = details;
          window._eyesContour.left = contour.clone();
          await drawEye("left", src);
        } else if (manualSelectionType.value === "right_eye") {
          data.value.analysis.eyes = data.value.analysis.eyes || {};
          data.value.analysis.eyes.right = details;
          window._eyesContour.right = contour.clone();
          await drawEye("right", src);
        }

      }

      // Update the canvas with the modified Mat
      cv.imshow(canvasElement, src);

      addLog(`Manual selection completed: ` + manualSelectionType.value, "success", captureSnapshot(src));

      details.snapshot = captureSnapshot(src);
      if (manualSelectionType.value === "nose") {
        data.value.analysis.nose = details;
        window._noseContour = contour.clone();
      } else if (manualSelectionType.value === "left_ear") {
        data.value.analysis.ears = data.value.analysis.ears || {};
        data.value.analysis.ears.left = details;
        window._earsContour.left = contour.clone();
      } else if (manualSelectionType.value === "right_ear") {
        data.value.analysis.ears = data.value.analysis.ears || {};
        data.value.analysis.ears.right = details;
        window._earsContour.right = contour.clone();
      } else if (manualSelectionType.value === "left_eye") {
        data.value.analysis.eyes = data.value.analysis.eyes || {};
        data.value.analysis.eyes.left = details;
        window._eyesContour.left = contour.clone();
      } else if (manualSelectionType.value === "right_eye") {
        data.value.analysis.eyes = data.value.analysis.eyes || {};
        data.value.analysis.eyes.right = details;
        window._eyesContour.right = contour.clone();
      }

      src.delete();
      contour.delete();
    };

    const toggleView = () => {
      isJsonView.value = !isJsonView.value;
    };

    const filteredAnalysis = computed(() => {
      if (!data.value?.analysis) return {};

      // Create a deep copy to avoid modifying the original data
      const analysisCopy = JSON.parse(JSON.stringify(data.value.analysis));

      // Recursively remove the unwanted keys
      const removeKeys = (obj) => {
        for (const key in obj) {
          if (key === 'contour' || key === 'snapshot' || key === 'completed') {
            delete obj[key];
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            removeKeys(obj[key]);
          }
        }
      };

      removeKeys(analysisCopy);
      return analysisCopy;
    });

    const downloadAnalysis = () => {
      if (!filteredAnalysis.value) {
        addLog("No analysis data available to download.", "error");
        return;
      }

      // Convert the filteredAnalysis to a JSON string
      const jsonContent = JSON.stringify(filteredAnalysis.value, null, 2);

      // Create a Blob from the JSON string
      const blob = new Blob([jsonContent], {type: "application/json"});

      // Create a URL for the Blob
      const url = URL.createObjectURL(blob);

      // Create a temporary <a> element to trigger the download
      const a = document.createElement("a");
      a.href = url;
      a.download = "analysis.json"; // Set the file name
      document.body.appendChild(a);
      a.click();

      // Clean up the DOM
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addLog("JSON file downloaded successfully.", "success");
    };

    const downloadSnapshot = (snapshot, logIndex) => {
      if (!snapshot) {
        addLog(`Snapshot not available for log #${logIndex}`, "error");
        return;
      }

      // Vytvorenie odkazu na sťahovanie
      const a = document.createElement("a");
      a.href = snapshot; // `snapshot` je base64 URL obrázku
      a.download = `log_snapshot_${logIndex + 1}.png`; // Názov sťahovaného súboru
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      addLog(`Snapshot downloaded for log #${logIndex + 1}`, "success");
    };

    const applyTransformations = (context, center, angleRad = 0, scale = 1) => {
      context.translate(center.x, center.y);
      context.rotate(angleRad);
      context.scale(scale, scale);
      context.translate(-center.x, -center.y);
    }

    const rotateCanvasByNose = () => {
      const canvasElement = canvasRef.value;
      const context = canvasElement?.getContext('2d');
      const nose = data.value?.analysis?.nose?.position;

      if (!canvasElement || !context || !nose) {
        addLog("Missing canvas, context or nose for rotation", "error");
        return;
      }

      // Zresetuj transformáciu a canvas
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvasElement.width, canvasElement.height);

      // Priprav dočasné plátno s originálnym obrázkom
      const tempCanvas = document.createElement('canvas');
      const tempContext = tempCanvas.getContext('2d');
      tempCanvas.width = originalImage.value.width;
      tempCanvas.height = originalImage.value.height;
      tempContext.putImageData(originalImage.value, 0, 0);

      const img = new Image();
      img.onload = async () => {
        const angleDeg = -(90 - data.value.analysis.nose.angle);
        const angleRad = angleDeg * (Math.PI / 180);
        const scale = 1;

        applyTransformations(context, nose, angleRad, scale);
        context.drawImage(img, 0, 0);
        addLog(`Applied rotation around nose (${angleDeg}°)`, "success", canvasElement.toDataURL());

        // Scaling
        try {
          const classifier = await loadCascadeClassifier('/models/haarcascade_frontalcatface.xml');
          // Use the classifier
          const canvasElement = canvasRef.value;
          if (!canvasElement) {
            addLog("Canvas element not found", "error");
            return;
          }

          const src = cv.imread(canvasElement);
          const gray = new cv.Mat();
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

          const cats = new cv.RectVector();
          classifier.detectMultiScale(gray, cats);

          if (cats.size() > 0) {
            const catRect = cats.get(0);
            const x = catRect.x;
            const y = catRect.y;
            const w = catRect.width;
            const h = catRect.height;

            // Optional: Draw line similar to extBot[0] + 4 if available
            // cv.line(src, new cv.Point(x + 4, 0), new cv.Point(x + 4, src.rows), new cv.Scalar(0, 0, 255, 255), 1);

            const cropped = src.roi(new cv.Rect(
                Math.max(0, x - 80),
                Math.max(0, y - 120),
                Math.min(w + 180, src.cols - x + 80),
                Math.min(h + 120, src.rows - y + 120)
            ));

            const resized = new cv.Mat();
            const maxSize = 400;
            const aspectRatio = cropped.cols / cropped.rows;

            let newWidth, newHeight;

            if (aspectRatio > 1) {
              newWidth = maxSize;
              newHeight = Math.round(maxSize / aspectRatio);
            } else {
              newHeight = maxSize;
              newWidth = Math.round(maxSize * aspectRatio);
            }

            const size = new cv.Size(newWidth, newHeight);
            cv.resize(cropped, resized, size, 0, 0, cv.INTER_AREA);

            // Show on canvas or export
            cv.imshow(canvasElement, resized);
            originalImage.value = canvasElement.getContext('2d').getImageData(0, 0, canvasElement.width, canvasElement.height);
            addLog("Cat face detected and scaled to " + newWidth + "x" + newHeight, "success", canvasElement.toDataURL());

            // again detect nose on little different image and with different dimensions
            const newNoseData = await detectNose(resized, true);
            if (newNoseData !== 'ERROR') {
              newNoseData.completed = true;
            }
            data.value.analysis.nose = newNoseData;
            data.value.analysis.rotation.angle = angleDeg

            data.value.analysis.rotation.snapshot = data.value.analysis.nose.snapshot

            cropped.delete();
            resized.delete();
          } else {
            addLog("No cat face detected", "error");
          }

          gray.delete();
          cats.delete();
          src.delete();
        } catch (error) {
          console.error("Error in rotating:", error);
        }
      };

      img.src = tempCanvas.toDataURL();
    };

    const confirmLeftEar = () => {
      data.value.analysis.ears.left.completed = true

      const canvasElement = canvasRef.value;
      const src = cv.imread(canvasElement);
      drawEar(src, data.value.analysis.ears.right, 'right')
    };

    const confirmRightEar = async () => {
      data.value.analysis.ears.right.completed = true;

      const canvasElement = canvasRef.value;
      const src = cv.imread(canvasElement); // použijeme aktuálny stav plátna
      await drawEar(src, data.value.analysis.ears.right, 'right'); // dokreslíme pravé ucho k aktuálnemu stavu

      data.value.analysis.ears.right.snapshot = captureSnapshot(src);
      cv.imshow(canvasElement, src); // zobrazíme všetko (ľavé + práve ucho)

      handleEyesProcess(); // pokračuj v analýze očí
    };

    const manualRotationAngle = ref(0);

    const updateManualRotation = (value) => {
      manualRotationAngle.value = Number(value);
      applyManualRotation();
    };

    const applyManualRotation = () => {
      const canvasElement = canvasRef.value;
      if (!canvasElement || !originalImage.value) return;

      const context = canvasElement.getContext('2d');
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvasElement.width, canvasElement.height);

      // Vždy pracuj s pôvodným originálnym obrázkom (neprepisuj ho!)
      const tempCanvas = document.createElement('canvas');
      const tempContext = tempCanvas.getContext('2d');
      tempCanvas.width = originalImage.value.width;
      tempCanvas.height = originalImage.value.height;
      tempContext.putImageData(originalImage.value, 0, 0);

      const img = new Image();
      const angleValue = manualRotationAngle.value;

      img.onload = async () => {
        canvasElement.width = img.width;
        canvasElement.height = img.height;

        const center = {
          x: canvasElement.width / 2,
          y: canvasElement.height / 2
        };
        const angleRad = angleValue * Math.PI / 180;

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvasElement.width, canvasElement.height);
        applyTransformations(context, center, angleRad, 1);
        context.drawImage(img, 0, 0);

        data.value.analysis.rotation.angle = angleValue;

        // Ak chceš update snapshotu, môžeš to nechať
        const src = cv.imread(canvasElement);
        await drawNose(src, data.value.analysis.nose);
        data.value.analysis.rotation.snapshot = captureSnapshot(src);
      };

      img.src = tempCanvas.toDataURL();
    };

    const loadCascadeClassifier = async (url) => {
      return new Promise((resolve, reject) => {
        const faceClassifier = new cv.CascadeClassifier();
        const utils = new Utils('errorMessage', cv);

        utils.createFileFromUrl(url, url, () => {
          try {
            const success = faceClassifier.load(url);
            if (!success) {
              reject(new Error(`Cascade file loaded but classifier.load() returned false for ${url}`));
            } else {
              resolve(faceClassifier);
            }
          } catch (err) {
            if (typeof err === 'number') {
              reject(new Error(cv.exceptionFromPtr(err).msg));
            } else {
              reject(err);
            }
          }
        });
      });
    };

    return {
      data,
      canvasRef,
      logsRef,
      onFileChange,
      handleEarsProcess,
      loadExampleImage,
      handleProcess,
      getStatus,
      isLoading,
      enableManualSelection,
      onCanvasClick,
      manualMode,
      manualSelectionType,
      isJsonView,
      toggleView,
      filteredAnalysis,
      downloadAnalysis,
      downloadSnapshot,
      rotateCanvasByNose,
      handleRotation,
      confirmLeftEar,
      confirmRightEar,
      manualRotationAngle,
      applyManualRotation,
      updateManualRotation,
      confirmLeftEye,
      confirmRightEye,
      confirmChin,
      confirmTransformation,
      selectionPoints,
      savedAnalyseId
    };
  },
};
</script>

<style scoped>
.file-input-container {
  @apply gap-3 bg-gray-100 border-gray-200 border p-10 w-[500px] rounded-xl flex items-center justify-center h-[50vh] flex-col text-gray-600 hover:text-gray-700 transition cursor-pointer;
}

.image-holder {
  @apply relative flex justify-center flex-[1.5];

  canvas {
    @apply border-0 w-auto max-w-full max-h-[70vh] ;
  }

  canvas, .main-image-replacement {
    @apply rounded-xl;
    transition: scale .2s;
  }
}

.logs {
  @apply relative;

  flex: 1;
  padding-left: 2px;
  overflow: auto;
  max-height: 55vh;

  .item {
    @apply relative;

    & {
      padding-left: 15px;
    }

    &:before {
      content: '>';
      position: absolute;
      left: 0;
    }

    &.is-error {
      @apply text-red-500;
    }

    &.is-success {
      @apply text-green-700;
    }

    &.is-headline {
      @apply text-slate-900 pl-0 font-bold;

      &:before {
        display: none;
      }
    }
  }
}

.info-card {
  @apply bg-green-200 px-5 py-3 rounded-lg flex flex-col font-bold text-xl relative;

  .fraction {
    @apply text-sm text-slate-400;
  }

  &.is-error {
    @apply bg-red-700 text-white;

    .fraction {
      @apply text-slate-300;
    }
  }

  .main-data {
    @apply flex items-center gap-2;
  }

  .additional-data {
    @apply hidden rounded-lg flex-col text-base justify-end text-right font-normal;
  }

  &:hover {
    @apply absolute right-0 top-0 ;

    .main-data {
      @apply justify-end text-2xl;
    }

    .additional-data {
      @apply flex;
    }
  }
}

.status-indicator {
  @apply w-5 h-5 rounded-full inline-block bg-green-600;

  &.is-error {
    @apply bg-red-600;
  }
}

.result-text-item {
  @apply flex flex-col flex-1;

  &.is-title {
    @apply text-lg font-bold mb-2 pt-2 flex justify-between flex-row items-center;
  }

  .attribute {
    @apply text-slate-500;
  }

  .value {
    @apply text-xl font-bold;
  }

  button {
    @apply text-base border-0 py-0 w-auto;
  }
}

.result-actions {
  @apply flex gap-3 mt-3;

  button {
    @apply text-base border-2 w-auto;

    &.secondary {
      @apply gap-1
    }
  }
}

.section {
  @apply transition;
}

.glowing.section {
  & {
    width: 110%;
    position: relative;
    left: -5%;
    height: 105%;
  }


  .result-text-item {
    &.is-title {
      @apply pt-0;
    }
  }
}

.loading-spinner {
  border-color: white;
  border-top-color: #950cde;
  width: 30px;
  border-width: 5px;
  height: 30px;
}

.main-image-replacement {
  position: absolute;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.json-view {
  background-color: #f9f9f9;
  padding: 16px;
  border-radius: 8px;
  font-family: monospace;
  white-space: pre-wrap;
  overflow: auto;
  position: relative;
}

.json-button {
  @apply gap-0 border-0 bg-gray-100 text-gray-600 w-auto text-sm rounded px-2 py-2 normal-case hover:bg-gray-200 ;
}
</style>