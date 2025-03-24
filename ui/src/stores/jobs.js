import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { toast } from "vue3-toastify";

export const useJobsStore = defineStore("jobs", () => {
  const jobs = ref([]);
  const selectedJob = ref(null);
  const loading = ref(false);

  const handleError = (error, message = "Ocorreu um erro") => {
    console.error(message, error);
    toast.error(`${message}: ${error.message || error}`);
  };

  const handleSuccess = (message) => {
    toast.success(message);
  };

  const fetchJobs = async () => {
    loading.value = true;
    try {
      const response = await fetch("/api/jobs");
      const data = await response.json();
      jobs.value = data.jobs || [];
    } catch (error) {
      handleError(error, "Erro ao carregar jobs");
    } finally {
      loading.value = false;
    }
  };

  const selectJob = async (jobId) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();
      selectedJob.value = data;
    } catch (error) {
      handleError(error, "Erro ao carregar detalhes do job");
    }
  };

  const createJob = async (jobData) => {
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jobData),
      });
      const data = await response.json();
      if (data.jobId) {
        handleSuccess("Job criado com sucesso!");
        await fetchJobs();
        await selectJob(data.jobId);
      }
    } catch (error) {
      handleError(error, "Erro ao criar job");
    }
  };

  const approveJob = async (jobId) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/approve`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        handleSuccess("Job aprovado com sucesso!");
        await fetchJobs();
        await selectJob(jobId);
      }
    } catch (error) {
      handleError(error, "Erro ao aprovar job");
    }
  };

  const generateVideo = async (jobId) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/generate-video`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        handleSuccess("Geração de vídeo iniciada!");
        await fetchJobs();
        await selectJob(jobId);
      }
    } catch (error) {
      handleError(error, "Erro ao gerar vídeo");
    }
  };

  const closeJobDetails = () => {
    selectedJob.value = null;
  };

  const regenerateImage = async (jobId, sceneIndex) => {
    try {
      const payload = sceneIndex !== null ? { imageIndex: sceneIndex } : {};

      const response = await fetch(`/api/jobs/${jobId}/regenerate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status <= 201) {
        handleSuccess("Imagem regenerada com sucesso!");
      } else {
        handleError(response, "Erro ao regenerar imagem");
      }
    } catch (error) {
      handleError(error, "Erro ao regenerar imagem");
      throw error;
    }
  };

  const regenerateAudio = async (jobId, sceneIndex) => {
    try {
      const payload = sceneIndex !== null ? { audioIndex: sceneIndex } : {};

      const response = await fetch(`/api/jobs/${jobId}/regenerate-audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status <= 201) {
        handleSuccess("Áudio regenerado com sucesso!");
      } else {
        handleError(response, "Erro ao regenerar áudio");
      }
    } catch (error) {
      handleError(error, "Erro ao regenerar áudio");
      throw error;
    }
  };

  return {
    jobs,
    selectedJob,
    loading,
    fetchJobs,
    selectJob,
    createJob,
    approveJob,
    generateVideo,
    closeJobDetails,
    regenerateImage,
    regenerateAudio,
  };
});
