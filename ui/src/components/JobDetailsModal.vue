<template>
  <div
    class="modal fade"
    tabindex="-1"
    aria-labelledby="jobDetailsModalLabel"
    aria-hidden="true"
    :class="{ show: selectedJob, 'd-block': selectedJob }"
  >
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="jobDetailsModalLabel">
            Detalhes do Trabalho
          </h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>
        <div class="modal-body">
          <JobDetailsContent v-if="selectedJob" :job="selectedJob" />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useJobsStore } from "../stores/jobs";
import JobDetailsContent from "./JobDetailsContent.vue";

const jobsStore = useJobsStore();
const selectedJob = computed(() => jobsStore.selectedJob);

const closeModal = () => {
  jobsStore.closeJobDetails();
};
</script>
