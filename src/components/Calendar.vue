<script setup lang="ts">
import type { Movie } from '../movies';
import CalendarDoor from './CalendarDoor.vue';

defineProps<{ movies: Movie[]; availableDay: number; today: number | null; openedDays: number[]; openDay: number | null }>();
const emit = defineEmits<{ toggle: [day: number] }>();
</script>

<template>
  <div class="calendar-grid">
    <CalendarDoor v-for="movie in movies" :key="movie.day" :movie="movie"
      :locked="movie.day > availableDay" :opened="openedDays.includes(movie.day)"
      :is-open="openDay === movie.day" :is-today="today === movie.day" @toggle="emit('toggle', $event)"/>
  </div>
</template>
