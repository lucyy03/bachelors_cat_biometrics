<script lang="ts">
import LayoutHeader from "../components/LayoutHeader.vue";
import {useRoute} from 'vue-router';
import CatInformation from "../components/CatInformation.vue";

export default {
  name: "CatDetail",
  components: {LayoutHeader, CatInformation},
  data() {
    return {
      isLoading: false,
      message: null,

    };
  },
  setup() {
    const route = useRoute();
    const catId = route.params.id.toString()
    return {catId};
  }
}
</script>

<template>
  <div>
    <LayoutHeader/>
    <div class="content w-full without-title">
      <CatInformation :id="catId"/>
    </div>
  </div>
</template>

<style scoped lang="scss">
</style>
