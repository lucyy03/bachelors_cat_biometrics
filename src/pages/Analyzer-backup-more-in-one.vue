<template>
  <div>
    <LayoutHeader/>
    <div class="content w-full without-title">
      <div class="container flex flex-col gap-5">
        <div class="controls flex gap-2 items-center">
          <button class="button primary" @click="analyzeAllImages" v-if="images.length>0">Process All Images</button>
          <button class="button tertiary" @click="loadExampleImages">Load Example Images</button>
          <button class="button secondary" @click="exportData" disabled v-if="images.length>0">Export Data as CSV
          </button>
          <input type="file" id="fileInput" @change="onFileChange" multiple accept="image/*">
          <div v-if="images.length > 0"
               :class="'ml-auto info-card is-' + (successRate.percentage < SUCCESS_RATE && !isLoading ? 'error':'success')">
            <div class="flex gap-2 fraction items-center" v-if="isLoading">
              {{ processedCount }} / {{ images.length }}
              <LoadingSpinner/>
            </div>
            <div class="main-data" v-else>
              {{ successRate.percentage }}% <span class="fraction">{{ successRate.fraction }}</span>
            </div>
            <div class="additional-data">
              <div>Ears: <strong>{{ correctEarsCount }} / {{ images.length }}</strong></div>
              <div>Nose: <strong>{{ correctNoseCount }} / {{ images.length }}</strong></div>
            </div>
          </div>
        </div>
        <div v-for="(image, index) in images" :key="index" class="image-analysis">
          <div class="flex gap-5 justify-between items-start">
            <div class="flex flex-1 flex-col gap-2">
              <div class="text-2xl font-bold flex gap-2 items-center">
                <div :class="'status-indicator is-' + getStatus(image)"></div>
                <span class="truncate max-w-[500px]">{{ image.filename }}</span>
              </div>
              <div class="logs text-slate-500" v-if="image.logs.length > 0">
                <div v-for="(log, logIndex) in image.logs"
                     :key="logIndex"
                     @mouseover="image.currentSnapshot = log.snapshot"
                     @mouseleave="image.currentSnapshot = null"
                     :class="'item is-' + log.type">
                  <font-awesome-icon v-if="log.snapshot" icon="image" fixed-width/>
                  {{ log.message }}
                </div>
              </div>
            </div>
            <div class="image-holder">
              <canvas :ref="el => canvasRefs[index] = el"></canvas>
              <img v-if="image.currentSnapshot" :src="image.currentSnapshot" class="main-image-replacement shadow-2xl"
                   alt="snapshot preview"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
import FancyButton from '../components/FancyButton.vue'; // Remove if not used
import {ref, nextTick, computed} from 'vue';
import LayoutHeader from "../components/LayoutHeader.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import cv, {Mat, Rect} from "opencv-ts";

const SUCCESS_RATE = 20

export default {
  name: 'AnalyzerOld',
  components: {LoadingSpinner, LayoutHeader, FancyButton},
  setup() {
    const images = ref([]);
    const canvasRefs = ref([]); // Array to store each canvas element's reference
    const isLoading = ref(false);
    const processedCount = ref(0);
    const currentSnapshot = ref(null);

    const captureSnapshot = (mat) => {
      const tempCanvas = document.createElement('canvas');
      cv.imshow(tempCanvas, mat);
      return tempCanvas.toDataURL(); // Get the image as a base64 data URL
    };

    const addLog = (index, message, type = 'info', snapshot = null) => {
      images.value[index].logs.push({
        message,
        type,
        snapshot,
      });
    };

    const getStatus = (image) => {
      return image.logs.some(log => log.type === 'error') ? 'error' : 'success';
    };

    const onFileChange = (event) => {
      const files = Array.from(event.target.files);
      files.forEach(file => loadImage(file));
    };

    const loadImage = async (file) => {
      const img = new Image();

      // Define the `onload` callback first
      img.onerror = () => {
        console.error("Error loading image:", file.name);
      };
      img.onload = async () => {
        images.value.push({
          file,
          filename: file.name.replace(/\.[^/.]+$/, ""),
          verification: {
            nose: false,
            ears: false,
          },
          data: {
            ID: null,
            "Stredový bod nosa": null,
            "Uhol rotácie": null,
            "Bod ucha 1": null,
            "Bod ucha 2": null,
          },
          logs: [],
          currentSnapshot: null,
        });

        await nextTick(); // Ensure the canvas element is available after rendering

        const canvasIndex = images.value.length - 1;
        const canvasElement = canvasRefs.value[canvasIndex];
        if (canvasElement) {
          const context = canvasElement.getContext('2d');
          canvasElement.width = img.width;
          canvasElement.height = img.height;
          context.drawImage(img, 0, 0);
          addLog(canvasIndex, "File loaded", "success");
        } else {
          addLog(canvasIndex, "Canvas element not found", "error");
        }
      };

      // Set the source after defining `onload`
      img.src = URL.createObjectURL(file);
    };


    // Import all .jpg files in the examples folder as a list of promises
    const exampleImages = import.meta.glob('/src/assets/examples/*.jpg');

    const loadExampleImages = async () => {
      for (const [path, loadModule] of Object.entries(exampleImages)) {
        try {
          const module = await loadModule();  // Dynamically import the image
          const img = new Image();
          img.src = module.default;

          img.onload = async () => {
            images.value.push({
              file: null, // Not an uploaded file, so no file object
              filename: path.split('/').pop().replace(/\.[^/.]+$/, ""), // Extract filename from the path
              verification: {
                nose: false,
                ears: false,
              },
              data: {
                ID: null,
                "Stredový bod nosa": null,
                "Uhol rotácie": null,
                "Bod ucha 1": null,
                "Bod ucha 2": null,
              },
              logs: [],
            });

            await nextTick();

            const canvasIndex = images.value.length - 1;
            const canvasElement = canvasRefs.value[canvasIndex];
            if (canvasElement) {
              const context = canvasElement.getContext('2d');
              canvasElement.width = img.width;
              canvasElement.height = img.height;
              context.drawImage(img, 0, 0);
              addLog(canvasIndex, "Example image loaded", "success");
            } else {
              addLog(canvasIndex, "Canvas element not found for example image", "error");
            }
          };

          img.onerror = () => {
            console.error(`Error loading example image: ${path}`);
            addLog(null, `Error loading example image: ${path}`, "error");
          };

        } catch (error) {
          console.error(`Error loading example image: ${path}`, error);
          addLog(null, `Error loading example image: ${path}`, "error");
        }
      }
    };

    const analyzeAllImages = async () => {
      isLoading.value = true;  // Start loading
      for (const [index, _] of images.value.entries()) {
        await initializeImageProcessing(index);  // Process each image sequentially
        await new Promise(resolve => setTimeout(resolve, 100)); // Temporary delay for testing
        processedCount.value += 1;
      }
      isLoading.value = false;  // Finish loading
    };

    // Function to check if OpenCV is loaded
    const checkOpenCVLoaded = () => {
      if (window.cv && window.cv.imread) {
        // initializeImageProcessing();
      } else {
        addLog(index, "Waiting for OpenCV to load...");
        setTimeout(checkOpenCVLoaded, 100);
      }
    };


    const initializeImageProcessing = (index) => {
      if (!cv) {
        console.error("OpenCV.js is not loaded or cv.imread is not available.");
        return;
      }
      // if (!cv.imread) {
      //   console.log(cv)
      //   console.error("cv.imread is not available.");
      //   return;
      // }
      const canvasElement = canvasRefs.value[index];
      if (!canvasElement) {
        addLog(index, "Canvas element not found", "error");
        return;
      }

      try {
        console.log(canvasElement)
        const src = cv.imread(canvasElement);
        addLog(index, "Image successfully loaded from canvas", "success");

        // Detect the nose and retrieve its details
        const noseDetails = detectNose(src, index);

        if (noseDetails) {
          // Pass the nose details to ear detection
          detectEars(src, index, noseDetails.center, noseDetails.width, noseDetails.height);
        } else {
          addLog(index, "Skipping ear detection due to missing nose details", 'error');
        }

        cv.imshow(canvasElement, src);
        src.delete();
      } catch (error) {
        console.error("Error processing the image: ", error);
        addLog(index, "Error processing the image", "error");
      }
    };

    const detectNose = (src, index) => {
      let noseDetails = null;
      addLog(index, 'Starting nose detection', 'headline', captureSnapshot(src));
      try {
        if (!src || src.empty()) {
          addLog(index, "Error in detectNose: Source image is empty or undefined", 'error');
          return;
        }

        // Step 1: Convert from RGBA to RGB
        const rgbImg = new cv.Mat();
        cv.cvtColor(src, rgbImg, cv.COLOR_RGBA2RGB, 0);
        addLog(index, "Converted from RGBA to RGB", 'info', captureSnapshot(rgbImg));

        // Step 2: Convert the RGB image to HSV
        const hsvImg = new cv.Mat();
        cv.cvtColor(rgbImg, hsvImg, cv.COLOR_RGB2HSV, 0);
        addLog(index, "Converted the RGB image to HSV", 'info', captureSnapshot(hsvImg));

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
        addLog(index, "Created a combined mask with multiple HSV ranges", 'info', captureSnapshot(noseMask));

        // Step 5: Apply morphological operations with a larger kernel to clean up the mask
        const kernelClose = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(7, 7));
        const kernelOpen = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
        cv.morphologyEx(noseMask, noseMask, cv.MORPH_CLOSE, kernelClose);
        cv.morphologyEx(noseMask, noseMask, cv.MORPH_OPEN, kernelOpen);

        addLog(index, "Refined mask after morphological operations", 'info', captureSnapshot(noseMask));

        // Step 6: Find contours in the mask
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(noseMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        if (contours.size() === 0) {
          addLog(index, "No contours detected in refined mask", 'error');
          return;
        } else {
          addLog(index, contours.size() + " contours detected", 'info');
        }

        // Define middle-upper region coordinates
        const imageHeight = src.rows;
        const imageWidth = src.cols;
        const middleUpperRegion = {
          x: imageWidth * 0.2,
          y: imageHeight * 0.1,
          width: imageWidth * 0.6,
          height: imageHeight * 0.6
        };

        // Log and visualize the middle-upper region
        const regionSnapshot = src.clone();
        cv.rectangle(
            regionSnapshot,
            new cv.Point(middleUpperRegion.x, middleUpperRegion.y),
            new cv.Point(middleUpperRegion.x + middleUpperRegion.width, middleUpperRegion.y + middleUpperRegion.height),
            new cv.Scalar(255, 0, 0, 255),
            2
        );
        addLog(index, `Middle-upper region position`, 'info', captureSnapshot(regionSnapshot));
        regionSnapshot.delete();

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

          const isValidSize = area > 100 && area < 2000;
          const isValidAspectRatio = aspectRatio > 0.5 && aspectRatio < 1.5;

          // Draw the contour temporarily on a clone for logging purposes
          const contourSnapshot = src.clone();
          cv.drawContours(contourSnapshot, contours, i, new cv.Scalar(0, 255, 0, 255), 2);

          if (isInMiddleUpperRegion && isValidAspectRatio && isValidSize) {
            // Capture a snapshot of the candidate contour for the log
            addLog(index, `Found potential nose contour - Area: ${area}, Aspect Ratio: ${aspectRatio}`, 'info', captureSnapshot(contourSnapshot));

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
              addLog(index, `Contour rejected: Not in middle upper region`, 'info', captureSnapshot(contourSnapshot));
            } else if (!isValidSize) {
              addLog(index, `Contour rejected: Invalid size - Area: ${area}`, 'info', captureSnapshot(contourSnapshot));
            } else if (!isValidAspectRatio) {
              addLog(index, `Contour rejected: Invalid aspect ratio`, 'info', captureSnapshot(contourSnapshot));
            } else {
              addLog(index, `idk why ended`, 'info', captureSnapshot(contourSnapshot));
            }
          }
        }

        if (noseContourIndex === -1) {
          addLog(index, "No suitable contour found for the nose", 'error');
          return;
        }

        // Step 8: Calculate and log nose center and rotation
        const noseContour = contours.get(noseContourIndex);
        const boundingRect = cv.boundingRect(noseContour);
        const noseCenter = {
          x: boundingRect.x + boundingRect.width / 2,
          y: boundingRect.y + boundingRect.height / 2
        };
        const noseWidth = boundingRect.width;
        const noseHeight = boundingRect.height;
        const extTop = {x: boundingRect.x, y: boundingRect.y};

        // Draw key points
        cv.circle(src, new cv.Point(noseCenter.x, noseCenter.y), 8, new cv.Scalar(255, 255, 0, 255), -1);
        cv.circle(src, new cv.Point(extTop.x, extTop.y), 8, new cv.Scalar(255, 255, 0, 255), -1);

        // Draw the detected contour
        cv.drawContours(src, contours, noseContourIndex, new cv.Scalar(0, 255, 0, 255), 2);
        addLog(index, `Nose found! Center: (${noseCenter.x}, ${noseCenter.y})`, 'success', captureSnapshot(src));
        noseDetails = {center: noseCenter, width: noseWidth, height: noseHeight};

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
        contours.delete();
        hierarchy.delete();
      } catch (error) {
        console.error("Error in detectNose: ", error);
        addLog(index, "Error in detectNose", 'error');
      }
      return noseDetails
    };

    const detectEars = (src, index, noseCenter, noseWidth, noseHeight) => {
      addLog(index, 'Ears detection started', 'headline');
      try {
        if (!src || src.empty()) {
          addLog(index, "Error in detectEars: Source image is empty or undefined", 'error');
          return;
        }

        const imageWidth = src.cols;
        const imageHeight = src.rows;

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
        addLog(index, 'Visualized left and right ear regions', 'info', captureSnapshot(earRegionSnapshot));
        earRegionSnapshot.delete();

        // Step 1: Convert to grayscale and apply edge detection
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        const blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
        const edges = new cv.Mat();
        cv.Canny(blurred, edges, 50, 150);
        addLog(index, "Applied edge detection", 'info', captureSnapshot(edges));

        // Step 2: Find contours
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        addLog(index, `Contours found: ${contours.size()}`, 'info');

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

          // Debug: Visualize the current contour and its hull
          const contourSnapshot = src.clone();
          const hullContours = new cv.MatVector();
          hullContours.push_back(hull);
          const hullSnapshot = src.clone();
          cv.drawContours(hullSnapshot, hullContours, 0, new cv.Scalar(0, 0, 255, 255), 2); // Red for convex hull
          addLog(index, `Visualizing Convex Hull`, 'info', captureSnapshot(hullSnapshot));
          hullSnapshot.delete();
          addLog(
              index,
              `Contour analysis: Area: ${area}, Aspect Ratio: ${aspectRatio}, Solidity: ${solidity}`,
              'info',
              captureSnapshot(contourSnapshot)
          );
          contourSnapshot.delete();
          hullContours.delete();

          // Left ear evaluation
          if (!isValidSize) {
            addLog(index, 'Refused because isValidSize');
          }
          if (!isValidAspectRatio) {
            addLog(index, 'Refused because isValidAspectRatio');
          }
          if (!isInLeftRegion) {
            addLog(index, 'Refused because isInLeftRegion');
          }
          if (!isValidSolidity) {
            addLog(index, 'Refused because isValidSolidity');
          }
          if (isValidSize && isValidAspectRatio && isValidSolidity && isInLeftRegion) {
            if (area > maxLeftArea) {
              maxLeftArea = area;
              leftEarContourIndex = i;
            }
          }

          // Right ear evaluation
          // if (!isValidAspectRatio) {
          //   addLog(index, 'Refused because isValidAspectRatio');
          // }
          // if (!isInRightRegion) {
          //   addLog(index, 'Refused because isInRightRegion');
          // }
          // if (!isValidSolidity) {
          //   addLog(index, 'Refused because isValidSolidity');
          // }
          if (isValidSize && isValidAspectRatio && isValidSolidity && isInRightRegion) {
            if (area > maxRightArea) {
              maxRightArea = area;
              rightEarContourIndex = i;
            }
          }

          hull.delete();
        }

        // Step 4: Draw detected ears
        if (leftEarContourIndex !== -1) {
          cv.drawContours(src, contours, leftEarContourIndex, new cv.Scalar(255, 0, 0, 255), 2);
          addLog(index, 'Left ear detected and highlighted', 'success', captureSnapshot(src));
        } else {
          addLog(index, 'Left ear not detected', 'error');
        }

        if (rightEarContourIndex !== -1) {
          cv.drawContours(src, contours, rightEarContourIndex, new cv.Scalar(0, 255, 0, 255), 2);
          addLog(index, 'Right ear detected and highlighted', 'success', captureSnapshot(src));
        } else {
          addLog(index, 'Right ear not detected', 'error');
        }

        // Cleanup
        gray.delete();
        blurred.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();
      } catch (error) {
        console.error("Error in detectEars: ", error);
        addLog(index, "Error in detectEars", 'error');
      }
    };

    // Function to process image (triggers OpenCV check and processing)
    const processImage = () => {
      checkOpenCVLoaded();
    };

    // Export data as CSV
    // now supports only one image, probably nothing even, not tested.. im scared
    const exportData = () => {
      const headers = Object.keys(data).join(';') + '\n';
      const values = Object.values(data).join(';') + '\n';
      const csvContent = 'data:text/csv;charset=utf-8,' + headers + values;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'biometric_data.csv');
      document.body.appendChild(link);
      link.click();
    };

    const correctEarsCount = computed(() => {
      return images.value.filter(image => {
        return image.verification.ears;
      }).length;
    });

    const correctNoseCount = computed(() => {
      return images.value.filter(image => {
        return image.verification.nose;
      }).length;
    });

    // Function to determine if an image has succeeded
    const isSuccess = (image) => {
      return !image.logs.some(log => log.type === 'error');
    };

    // Computed property to calculate success rate
    const successRate = computed(() => {
      const totalImages = images.value.length;
      const successCount = images.value.filter(isSuccess).length;

      if (totalImages === 0) {
        return {percentage: 0, fraction: '(0/0)'};
      }

      const percentage = Math.round((successCount / totalImages) * 100);
      const fraction = `(${successCount}/${totalImages})`;
      return {percentage, fraction};
    });

    return {
      images,
      isLoading,
      processedCount,
      loadExampleImages,
      SUCCESS_RATE,
      correctEarsCount,
      correctNoseCount,
      successRate,
      getStatus,
      canvasRefs,
      analyzeAllImages,
      onFileChange,
      processImage,
      exportData,
      currentSnapshot
    };
  },
};
</script>

<style scoped>
.controls {
  @apply relative;

  button {
    width: 250px;
  }
}

.image-analysis {
  @apply p-5 bg-white rounded-lg shadow-sm;
}

.image-holder {
  position: relative;
  flex-basis: 45%;
  display: flex;
  justify-content: center;

  canvas {
    border: none;
    max-height: 70vh;
    width: auto;
    max-width: 100%;
  }
}

.logs {
  @apply relative;

  flex: 1;
  padding-left: 5px;
  overflow: auto;
  max-height: 60vh;

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

.content {
  padding-top: 2rem;
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
</style>