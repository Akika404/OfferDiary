<script setup lang="ts">
import { NCard, NText, NSpace, NButton, NIcon, NPopconfirm } from 'naive-ui'
import { TrashOutline } from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import type { Company } from '@/types'
import StatusTag from '@/components/common/StatusTag.vue'
import TimeElapsed from '@/components/common/TimeElapsed.vue'
import { useCompanyStore } from '@/stores/company'

const props = defineProps<{ company: Company }>()
const router = useRouter()
const companyStore = useCompanyStore()

function lastChangeTime(): string {
  const history = props.company.statusHistory
  if (history.length > 0) return history[history.length - 1].changedAt
  return props.company.appliedAt
}

function goDetail() {
  router.push(`/company/${props.company.id}`)
}

function handleDelete() {
  companyStore.removeCompany(props.company.id)
}
</script>

<template>
  <NCard
    size="small"
    hoverable
    style="cursor: pointer; margin-bottom: 8px; border-radius: 8px"
    @click="goDetail"
    content-style="padding: 12px"
  >
    <NSpace vertical :size="6">
      <NSpace justify="space-between" align="center">
        <NText strong style="font-size: 14px">{{ company.name }}</NText>
        <NPopconfirm @positive-click.stop="handleDelete">
          <template #trigger>
            <NButton
              quaternary
              circle
              size="tiny"
              @click.stop
            >
              <template #icon>
                <NIcon :size="14"><TrashOutline /></NIcon>
              </template>
            </NButton>
          </template>
          确定删除该公司？
        </NPopconfirm>
      </NSpace>
      <NText depth="3" style="font-size: 12px">{{ company.position }}</NText>
      <NSpace justify="space-between" align="center">
        <StatusTag :stage="company.status" :template-id="company.templateId" />
        <TimeElapsed :iso-string="lastChangeTime()" />
      </NSpace>
    </NSpace>
  </NCard>
</template>
