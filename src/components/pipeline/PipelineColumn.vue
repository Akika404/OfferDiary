<script setup lang="ts">
import { computed } from 'vue'
import { NText, NBadge } from 'naive-ui'
import { VueDraggable } from 'vue-draggable-plus'
import type { Company } from '@/types'
import { usePipelineStore } from '@/stores/pipeline'
import CompanyCard from './CompanyCard.vue'

const props = defineProps<{
  stageName: string
  companies: Company[]
}>()

const emit = defineEmits<{
  (e: 'update:companies', value: Company[]): void
}>()

const pipelineStore = usePipelineStore()
const stageColor = computed(() => pipelineStore.getStageColor(props.stageName))

const localList = computed({
  get: () => props.companies,
  set: (val) => emit('update:companies', val)
})
</script>

<template>
  <div class="pipeline-column">
    <div class="column-header" :style="{ borderTopColor: stageColor }">
      <NText strong>{{ stageName }}</NText>
      <NBadge :value="companies.length" :max="99" />
    </div>
    <VueDraggable
      v-model="localList"
      group="pipeline"
      :animation="200"
      ghost-class="ghost-card"
      class="column-body"
      item-key="id"
    >
      <template #item="{ element }">
        <CompanyCard :company="element" :key="element.id" />
      </template>
    </VueDraggable>
  </div>
</template>

<style scoped>
.pipeline-column {
  min-width: 200px;
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.column-header {
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 3px solid;
  background: #fafafa;
}

.column-body {
  flex: 1;
  padding: 8px;
  min-height: 100px;
  overflow-y: auto;
}

:deep(.ghost-card) {
  opacity: 0.4;
}
</style>
