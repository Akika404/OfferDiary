<script setup lang="ts">
import { NText } from 'naive-ui'
import { useTimeElapsed } from '@/composables/useTimeElapsed'

const props = defineProps<{ isoString: string; prefix?: string }>()
const elapsed = useTimeElapsed(() => props.isoString)
</script>

<template>
  <NText depth="3" style="font-size: 12px">
    {{ props.prefix }}{{ elapsed }}
  </NText>
</template>
