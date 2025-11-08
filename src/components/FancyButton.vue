<script setup lang="ts">
import {defineProps} from 'vue';

const props = defineProps<{
  text: string;
  type?: 'button' | 'submit' | 'reset';
  size?: 'md' | 'lg'
}>()
</script>

<template>
  <button :type="props.type || 'button'" :class="{'fancy-button': true, 'large': props.size === 'lg'}"><span>{{ props.text }}</span>
    <svg viewBox="-5 -5 110 110" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0,0 C0,0 100,0 100,0 C100,0 100,100 100,100 C100,100 0,100 0,100 C0,100 0,0 0,0"/>
    </svg>
  </button>
</template>

<style scoped lang="scss">
.fancy-button {
  --motion-ease: cubic-bezier(0.68, -0.6, 0.32, 1.6);
  --motion-duration: 0.3s;
  appearance: none;
  background: transparent;
  border: 0 !important;
  color: #fff;
  cursor: pointer;
  font-weight: 500;
  position: relative;
  transition: filter var(--motion-duration);

}

.fancy-button:hover {
  filter: brightness(1.1);
}

.fancy-button:active {
  filter: brightness(0.9);
}

.fancy-button > span {
  display: block;
  position: relative;
  transition: transform var(--motion-duration) var(--motion-ease);
  z-index: 1;
  padding: 2px 0;
}

.fancy-button:active > span {
  transform: scale(0.95);
}

.fancy-button > svg {
  fill: #950cde;
  position: absolute;
  top: -5%;
  left: -5%;
  width: 110%;
  height: 110%;
}

.fancy-button:disabled > svg {
  fill: #4f4a4f;
}

.fancy-button > svg > path {
  transition: var(--motion-duration) var(--motion-ease);
}


.fancy-button:not(.fancy-button:disabled):hover {
  & > span {
    transform: scale(1.05);
  }

  & > svg > path {
    d: path("M0,0 C0,-5 100,-5 100,0 C105,0 105,100 100,100 C100,105 0,105 0,100 C-5,100 -5,0 0,0");
  }
}

.fancy-button:active > svg > path {
  d: path("M0,0 C30,10 70,10 100,0 C95,30 95,70 100,100 C70,90 30,90 0,100 C5,70 5,30 0,0");
}

</style>
