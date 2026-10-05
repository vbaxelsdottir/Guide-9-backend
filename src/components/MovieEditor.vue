<script setup lang="ts">
import { ref } from 'vue';
import type { Movie } from '../movies';
const props = defineProps<{ movies: Movie[]; saveError: string; busy: boolean; online: boolean }>();
const emit = defineEmits<{ save: [movies: Movie[]]; cancel: [] }>();
const draft = ref(props.movies.map(movie => ({ ...movie })));
const error = ref('');

function submit() {
  if (props.busy) return;
  if (draft.value.some(movie => !movie.title.trim())) {
    error.value = 'Please enter a movie title for every day.';
    return;
  }
  error.value = '';
  emit('save', draft.value.map(movie => ({ ...movie, title: movie.title.trim() })));
}
</script>

<template>
  <form class="movie-editor" aria-labelledby="editor-title" @submit.prevent="submit">
    <h2 id="editor-title">Choose your Christmas movies</h2>
    <p>This list reveals every surprise. {{ online ? 'Changes save for everyone with access.' : 'Prepare your draft before saving online.' }} Editing closes December 1 at 00:00 UTC.</p>
    <div class="editor-grid">
      <label v-for="movie in draft" :key="movie.day"><span>December {{ movie.day }}</span><input v-model="movie.title" type="text" required maxlength="120" :disabled="busy"/></label>
    </div>
    <p v-if="error || saveError" role="alert">{{ error || saveError }}</p>
    <div class="editor-actions"><button class="save-button" type="submit" :disabled="busy">{{ busy ? 'Saving…' : 'Save movies' }}</button><button class="secondary-button" type="button" :disabled="busy" @click="emit('cancel')">Cancel</button></div>
  </form>
</template>
