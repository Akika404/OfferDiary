<script setup lang="ts">
import { NTag } from 'naive-ui'
import { usePipelineStore } from '@/stores/pipeline'

const props = defineProps<{
  stage: string
  templateId?: string
}>()
const pipelineStore = usePipelineStore()
</script>

<template>
  <NTag
    :bordered="false"
    size="small"
    round
    :color="{
      color: pipelineStore.getStageColor(props.stage, props.templateId) + '18',
      textColor: pipelineStore.getStageColor(props.stage, props.templateId),
      borderColor: 'transparent'
    }"
  >
    {{ props.stage }}
  </NTag>
</template>
