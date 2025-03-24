<template>
  <div>
    <div class="mb-3">
      <div class="d-flex justify-content-between align-items-center">
        <h6>
          Status:
          <span :class="`badge ${getStatusClass(job.status)}`">{{
            job.status
          }}</span>
        </h6>
        <small class="text-muted"
          >Criado em: {{ formatDate(job.createdAt) }}</small
        >
      </div>
    </div>
    <div class="mb-3">
      <h6>Prompt:</h6>
      <p>{{ job.prompt }}</p>
    </div>

    <div v-if="job.content?.scenes" class="mb-4">
      <h5 class="border-bottom pb-2 mb-3">Conteúdo por Cena</h5>
      <div
        v-for="(scene, index) in job.content.scenes"
        :key="index"
        class="card mb-3"
      >
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <h6 class="text-muted mb-2">Texto:</h6>
              <p class="scene-text">
                {{ scene.text || "Sem texto disponível" }}
              </p>
            </div>
            <div class="col-md-6">
              <h6 class="text-muted mb-2">Imagem:</h6>
              <div
                class="d-flex justify-content-between align-items-center mb-2"
              >
                <button
                  class="btn btn-sm btn-outline-secondary"
                  @click="regenerateAllImages"
                  title="Regenerar todas as imagens"
                >
                  <i class="bi bi-arrow-repeat"></i> Regenerar todas
                </button>
              </div>
              <div
                class="image-container"
                @mouseover="showRegenerateButton(index)"
                @mouseleave="hideRegenerateButton(index)"
              >
                <img
                  v-if="job.imageUrls?.[index]"
                  :src="getMediaUrl(job.imageUrls[index])"
                  class="img-fluid rounded mb-2"
                  :alt="`Imagem da cena ${index + 1}`"
                  @error="handleImageError(index)"
                />
                <div
                  v-if="!job.imageUrls?.[index] || imageError[index]"
                  class="placeholder-image"
                >
                  <i class="bi bi-image"></i>
                  <p class="text-muted">Imagem não disponível</p>
                </div>
                <button
                  v-if="showRegenerate[index]"
                  class="btn btn-sm btn-outline-primary regenerate-btn"
                  @click="regenerateImage(index)"
                  title="Gerar imagem novamente"
                >
                  <i class="bi bi-arrow-repeat"></i>
                </button>
              </div>
            </div>
            <div class="col-md-12">
              <h6 class="text-muted mb-2">Áudio:</h6>
              <div
                class="d-flex justify-content-between align-items-center mb-2"
              >
                <button
                  class="btn btn-sm btn-outline-secondary"
                  @click="regenerateAllAudios"
                  title="Regenerar todos os áudios"
                >
                  <i class="bi bi-arrow-repeat"></i> Regenerar todos
                </button>
              </div>
              <div
                class="audio-container"
                @mouseover="showRegenerateAudioButton(index)"
                @mouseleave="hideRegenerateAudioButton(index)"
              >
                <audio
                  v-if="job.audioUrls?.[index]"
                  controls
                  class="w-100 mb-2"
                  :src="getMediaUrl(job.audioUrls[index])"
                  @error="handleAudioError(index)"
                >
                  Seu navegador não suporta o elemento de áudio.
                </audio>
                <div
                  v-if="!job.audioUrls?.[index] || audioError[index]"
                  class="placeholder-audio"
                >
                  <i class="bi bi-file-earmark-music"></i>
                  <p class="text-muted">Áudio não disponível</p>
                </div>
                <button
                  v-if="showRegenerateAudio[index]"
                  class="btn btn-sm btn-outline-primary regenerate-audio-btn"
                  @click="regenerateAudio(index)"
                  title="Gerar áudio novamente"
                >
                  <i class="bi bi-arrow-repeat"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="job.videoUrl" class="mb-3">
      <h6>Vídeo Gerado:</h6>
      <div class="ratio ratio-16x9">
        <video controls>
          <source :src="job.videoUrl" type="video/mp4" />
          Seu navegador não suporta o elemento de vídeo.
        </video>
      </div>
    </div>

    <div
      v-if="job.status === 'READY'"
      class="d-flex justify-content-center gap-3"
    >
      <button class="btn btn-primary" @click="generateVideo(job.jobId)">
        Gerar Vídeo Agora
      </button>
    </div>

    <div v-if="job.error" class="alert alert-danger mt-3">
      <h6>Erro:</h6>
      <p>{{ job.error }}</p>
    </div>
  </div>
</template>

<script setup>
import { useJobsStore } from "../stores/jobs";
import { ref } from "vue";
import { toast } from "vue3-toastify";

const jobsStore = useJobsStore();

const props = defineProps({
  job: {
    type: Object,
    required: true,
  },
});

const imageError = ref({});
const audioError = ref({});
const showRegenerate = ref({});
const showRegenerateAudio = ref({});

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

const approveJob = async (jobId) => {
  await jobsStore.approveJob(jobId);
};

const generateVideo = async (jobId) => {
  await jobsStore.generateVideo(jobId);
};

const getMediaUrl = (url) => {
  if (url.startsWith("/storage/")) {
    return url.replace("/storage/", "/storage/");
  }
  return url;
};

const handleImageError = (index) => {
  imageError.value[index] = true;
};

const handleAudioError = (index) => {
  audioError.value[index] = true;
};

const showRegenerateButton = (index) => {
  showRegenerate.value[index] = true;
};

const hideRegenerateButton = (index) => {
  showRegenerate.value[index] = false;
};

const regenerateImage = async (index) => {
  try {
    await jobsStore.regenerateImage(props.job.jobId, index);
    imageError.value[index] = false;
  } catch (error) {
    toast.error(`Erro ao regenerar imagem: ${error.message || error}`);
  }
};

const showRegenerateAudioButton = (index) => {
  showRegenerateAudio.value[index] = true;
};

const hideRegenerateAudioButton = (index) => {
  showRegenerateAudio.value[index] = false;
};

const regenerateAudio = async (index) => {
  try {
    await jobsStore.regenerateAudio(props.job.jobId, index);
    audioError.value[index] = false;
  } catch (error) {
    toast.error(`Erro ao regenerar áudio: ${error.message || error}`);
  }
};

const regenerateAllAudios = async () => {
  try {
    await jobsStore.regenerateAudio(props.job.jobId, null);
    audioError.value = {};
  } catch (error) {
    toast.error(`Erro ao regenerar todos os áudios: ${error.message || error}`);
  }
};

const regenerateAllImages = async () => {
  try {
    await jobsStore.regenerateImage(props.job.jobId, null);
    imageError.value = {};
  } catch (error) {
    toast.error(
      `Erro ao regenerar todas as imagens: ${error.message || error}`
    );
  }
};
</script>

<style scoped>
.image-container {
  position: relative;
  min-height: 200px;
  background-color: #f8f9fa;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-image,
.placeholder-audio {
  text-align: center;
  color: #6c757d;
}

.placeholder-image i,
.placeholder-audio i {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.audio-container {
  position: relative;
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 0.25rem;
}

.scene-text {
  white-space: pre-wrap;
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 0.25rem;
}

.regenerate-btn {
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 1;
  padding: 0.25rem 0.5rem;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.regenerate-audio-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  padding: 0.25rem 0.5rem;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
