<template>
  <a :href="`cat/${id}`" :class="['cat-preview']">
    <div class="image-container">
      <img :src="imageSrc" :alt="`Image of ${name}`" @load="onImageLoaded"
           :class="['content-loading',{ 'is-loaded': !isImageLoading }]"/>
    </div>
    <div class="information">
      <div class="title">{{ name }}</div>
      <hr v-if="name">
      <table>
        <tr>
          <td>Breed</td>
          <td>{{ breedText }}</td>
        </tr>
        <tr>
          <td>Age</td>
          <td>{{ ageText }}</td>
        </tr>
      </table>
      <div class="score" v-if="!!reviewCount">
        <span class="text-lg text-slate-700">average</span>
        <strong>{{ Math.round(averageScore) }}</strong><span class="font-thin">/10</span></div>
      <button class="secondary">Detail</button>
    </div>
  </a>
</template>

<script lang="ts">
import {capitalizeFirstLetter} from "../utils/strings";

export default {
  name: "CatPreview",
  props: {
    name: String,
    breed: {
      type: String,
      required: true
    },
    id: {
      type: String,
      required: true
    },
    age: {
      type: Number,
      required: true
    },
    averageScore: {
      type: Number,
      required: true
    },
    reviewCount: {
      type: Number,
      required: true
    },
    imageSrc: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      isImageLoading: true
    };
  },
  methods: {
    onImageLoaded() {
      this.isImageLoading = false;
    },
  },
  computed: {
    breedText() {
      return capitalizeFirstLetter(`${this.breed}`)
    },
    ageText() {
      const age = this.age;
      if (age === 0) {
        return "Kitten";
      } else {
        let suffix = 'years';
        if (age === 1) {
          suffix = 'year';
        }
        return `${age} ${suffix}`;
      }
    }
  }
}
</script>

<style scoped lang="scss">
* {
  transition: .2s;
}

.cat-preview {
  @apply flex gap-3 text-2xl tracking-wide rounded-lg;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  //flex: 1 1 49%;
  width: 31%;

  &:hover {
    transform: scale(1.02);
  }

  .title {
    @apply uppercase;
  }

  .image-container {
    @apply flex-1 h-full overflow-hidden;
    min-width: 200px;

    img {
      @apply rounded-tl-lg rounded-bl-lg w-full h-full;
      object-fit: cover;
      object-position: center;
    }
  }

  .information {
    @apply flex flex-col gap-3 p-4 w-5/6 pl-1;

    table tr td:first-child {
      @apply text-slate-500 w-[157px];
    }

    button {
      @apply rounded;
    }

    .title {
      font-family: "Merienda", sans-serif;
      @apply text-3xl;
    }

    hr {
      @apply border-slate-400;
    }

    .score {
      @apply self-end mt-auto text-4xl flex-1 pb-2 flex gap-2 items-end;
      color: #27003a;
    }

    button {
      @apply text-base w-auto mt-auto;
    }
  }
}
</style>
