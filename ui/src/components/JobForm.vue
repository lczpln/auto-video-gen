<template>
  <form @submit.prevent="createJob">
    <div class="mb-3">
      <label for="prompt" class="form-label">Prompt</label>
      <textarea
        class="form-control"
        id="prompt"
        v-model="prompt"
        rows="4"
        placeholder="Descreva o vídeo que você deseja criar..."
        required
      ></textarea>
    </div>
    <div class="mb-3">
      <label class="form-label">Modelo de IA</label>
      <div class="form-check">
        <input
          class="form-check-input"
          type="radio"
          name="aiModel"
          id="gemini"
          value="gemini"
          v-model="aiModel"
          checked
        />
        <label class="form-check-label" for="gemini"> Gemini </label>
      </div>
    </div>
    <button type="submit" class="btn btn-primary">Gerar Vídeo</button>
  </form>
</template>

<script setup>
import { ref } from "vue";
import { useJobsStore } from "../stores/jobs";

const prompt = ref("");
const aiModel = ref("gemini");
const jobsStore = useJobsStore();

const createJob = async () => {
  if (prompt.value.trim()) {
    await jobsStore.createJob({
      prompt: prompt.value,
      options: { model: aiModel.value },
    });
    prompt.value = "";
  }
};
</script>
