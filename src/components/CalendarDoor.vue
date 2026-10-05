<script setup lang="ts">
import { computed } from 'vue';
import type { Movie } from '../movies';

const props = defineProps<{ movie: Movie; locked: boolean; opened: boolean; isOpen: boolean; isToday: boolean }>();
const emit = defineEmits<{ toggle: [day: number] }>();
const state = computed(() => props.locked ? 'Locked' : props.opened ? 'Opened' : 'Available');
</script>

<template>
  <button class="door" :class="[`tone-${movie.day % 4}`, { 'is-open': isOpen, 'is-today': isToday }]"
    type="button" :disabled="locked" :aria-pressed="isOpen"
    :aria-label="`December ${movie.day}, ${state}${isOpen ? `: ${movie.title}. Click to close` : ''}`"
    @click="emit('toggle', movie.day)">
    <span class="door-inner">
      <span class="door-face door-front" aria-hidden="true">
        <span class="door-top">{{ isToday ? 'TODAY' : 'DECEMBER' }}</span>
        <span class="door-number">{{ String(movie.day).padStart(2, '0') }}</span>
        <span class="door-symbol">{{ ['✧', '✶', '❋', '✦'][movie.day % 4] }}</span>
        <span class="door-status"><template v-if="locked"><span class="lock"/> Locked</template><template v-else>{{ opened ? '✓ Opened' : 'Open door' }}</template></span>
      </span>
      <span class="door-face door-back" :aria-hidden="!isOpen">
        <template v-if="isOpen">
          <span class="door-top">DECEMBER {{ movie.day }}</span>
          <span class="movie-star" aria-hidden="true">✦</span>
          <span class="movie-title">{{ movie.title }}</span>
          <span class="door-status">Enjoy your movie night</span>
        </template>
      </span>
    </span>
  </button>
</template>
