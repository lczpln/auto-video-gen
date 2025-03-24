<script setup>
import { onMounted } from "vue";
import { useJobsStore } from "./stores/jobs";
import JobForm from "./components/JobForm.vue";
import JobsList from "./components/JobsList.vue";
import JobDetailsModal from "./components/JobDetailsModal.vue";

const jobsStore = useJobsStore();

const refreshJobs = () => {
  jobsStore.fetchJobs();
};

onMounted(() => {
  jobsStore.fetchJobs();
});
</script>

<template>
  <div class="container">
    <header class="pb-3 mb-4 border-bottom">
      <div class="d-flex align-items-center text-dark text-decoration-none">
        <span class="fs-4">Auto Video Generator</span>
      </div>
    </header>

    <div class="row">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Criar Novo Vídeo</h5>
          </div>
          <div class="card-body">
            <JobForm @job-created="refreshJobs" />
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card">
          <div
            class="card-header d-flex justify-content-between align-items-center"
          >
            <h5 class="card-title mb-0">Vídeos Recentes</h5>
            <button
              @click="refreshJobs"
              class="btn btn-sm btn-outline-secondary"
            >
              <i class="bi bi-arrow-clockwise"></i> Atualizar
            </button>
          </div>
          <div class="card-body">
            <JobsList />
          </div>
        </div>
      </div>
    </div>

    <JobDetailsModal />
  </div>
</template>

<style>
body {
  padding-top: 4.5rem;
  background-color: #f8f9fa;
}

.card {
  margin-bottom: 1.5rem;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}

.status-badge {
  font-size: 0.8rem;
}

.status-indicator {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 5px;
}

.pending {
  background-color: #ffc107;
}

.processing {
  background-color: #0dcaf0;
}

.generating-assets {
  background-color: #6f42c1;
}

.ready {
  background-color: #20c997;
}

.approved {
  background-color: #0d6efd;
}

.generating-video {
  background-color: #6610f2;
}

.completed {
  background-color: #198754;
}

.error,
.failed {
  background-color: #dc3545;
}
</style>
