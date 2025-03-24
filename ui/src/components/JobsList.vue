<template>
  <div class="list-group">
    <div v-if="loading" class="text-center py-3">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Carregando...</span>
      </div>
    </div>
    <div v-else-if="jobs.length === 0" class="text-center py-3">
      <p class="text-muted">Nenhum trabalho encontrado.</p>
    </div>
    <div
      v-else
      v-for="job in jobs"
      :key="job.jobId"
      class="card job-card mb-2"
      @click="selectJob(job.jobId)"
    >
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <h6 class="card-title mb-1">{{ truncateText(job.prompt, 40) }}</h6>
          <span :class="`badge ${getStatusClass(job.status)} status-badge`">
            {{ job.status }}
          </span>
        </div>
        <p class="card-text text-muted small">
          {{ formatDate(job.createdAt) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useJobsStore } from "../stores/jobs";

const jobsStore = useJobsStore();
const jobs = computed(() => jobsStore.jobs);
const loading = computed(() => jobsStore.loading);

const selectJob = (jobId) => {
  jobsStore.selectJob(jobId);
};

const truncateText = (text, maxLength) => {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString();
};

const getStatusClass = (status) => {
  const statusMap = {
    PENDING: "pending",
    PROCESSING: "processing",
    GENERATING_ASSETS: "generating-assets",
    READY: "ready",
    APPROVED: "approved",
    GENERATING_VIDEO: "generating-video",
    COMPLETED: "completed",
    ERROR: "error",
    FAILED: "failed",
  };
  return statusMap[status] || "secondary";
};
</script>

<style scoped>
.job-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.job-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>
