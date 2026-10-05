<script setup lang="ts">
import { computed } from 'vue';
import { daysUntilChristmas } from '../date';
const props = defineProps<{ date: Date }>();
const days = computed(() => daysUntilChristmas(props.date));
</script>

<template>
  <div class="countdown"><span aria-hidden="true">✧</span><span v-if="days === 0">Merry Christmas!</span><span v-else><strong>{{ days }}</strong> {{ days === 1 ? 'day' : 'days' }} until Christmas</span></div>
</template>
