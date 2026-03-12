<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NBadge, NIcon, NTooltip, NModal, NInput, NSpace, NButton, NText, NColorPicker
} from 'naive-ui'
import {
  BookOutline,
  CalendarOutline,
  GridOutline,
  SettingsOutline
} from '@vicons/ionicons5'
import { useCompanyStore } from '@/stores/company'
import { useInterviewStore } from '@/stores/interview'
import { usePipelineStore } from '@/stores/pipeline'
import { useInterviewReminder } from '@/composables/useInterviewReminder'

const AVATAR_STORAGE_KEY = 'od-avatar'

const router = useRouter()
const route = useRoute()
const companyStore = useCompanyStore()
const interviewStore = useInterviewStore()
const pipelineStore = usePipelineStore()

onMounted(async () => {
  await pipelineStore.load()
  await Promise.all([
    companyStore.load(),
    interviewStore.load()
  ])
  loadAvatar()
})

useInterviewReminder()

const avatarText = ref('OD')
const avatarColor = ref('#c39fd9')
const showAvatarModal = ref(false)
const editText = ref('')
const editColor = ref('')

function loadAvatar() {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data.text) avatarText.value = data.text
      if (data.color) avatarColor.value = data.color
    }
  } catch { /* ignore */ }
}

function openAvatarModal() {
  editText.value = avatarText.value
  editColor.value = avatarColor.value
  showAvatarModal.value = true
}

function saveAvatar() {
  const text = editText.value.trim().slice(0, 4) || 'OD'
  avatarText.value = text
  avatarColor.value = editColor.value
  localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify({ text, color: editColor.value }))
  showAvatarModal.value = false
}

const navigationItems: Array<{ key: string; label: string; icon: Component }> = [
  {
    key: 'pipeline',
    label: '求职看板',
    icon: GridOutline
  },
  {
    key: 'calendar',
    label: '面试日历',
    icon: CalendarOutline
  },
  {
    key: 'settings',
    label: '设置',
    icon: SettingsOutline
  }
]

const activeKey = computed(() => {
  if (route.name === 'calendar') return 'calendar'
  if (route.name === 'settings') return 'settings'
  return 'pipeline'
})

const hasUpcomingInterview = computed(() => {
  const now = Date.now()
  return interviewStore.interviews.some((interview) => new Date(interview.scheduledAt).getTime() > now)
})

function navigate(key: string) {
  if (key === activeKey.value) return
  if (key === 'pipeline') router.push('/')
  else router.push(`/${key}`)
}
</script>

<template>
  <div class="app-shell">
    <aside class="floating-sidebar">
      <button class="brand-button" type="button" aria-label="回到求职看板" @click="navigate('pipeline')">
        <NIcon :size="24">
          <BookOutline />
        </NIcon>
      </button>

      <div class="nav-group">
        <NTooltip
          v-for="item in navigationItems"
          :key="item.key"
          placement="right"
          trigger="hover"
        >
          <template #trigger>
            <button
              type="button"
              class="nav-button"
              :class="{ 'nav-button--active': activeKey === item.key }"
              :aria-label="item.label"
              @click="navigate(item.key)"
            >
              <NBadge :dot="item.key === 'calendar' && hasUpcomingInterview" :offset="[3, 3]">
                <NIcon :size="24">
                  <component :is="item.icon" />
                </NIcon>
              </NBadge>
            </button>
          </template>
          {{ item.label }}
        </NTooltip>
      </div>

      <div class="sidebar-footer">
        <NTooltip placement="right" trigger="hover">
          <template #trigger>
            <button
              type="button"
              class="profile-badge"
              :style="{ background: avatarColor }"
              @click="openAvatarModal"
            >
              {{ avatarText }}
            </button>
          </template>
          修改头像
        </NTooltip>
      </div>
    </aside>

    <main class="app-content">
      <router-view />
    </main>

    <NModal
      v-model:show="showAvatarModal"
      preset="card"
      title="修改头像"
      style="width: 360px"
      :bordered="false"
    >
      <NSpace vertical :size="16">
        <div>
          <NText depth="3" style="display: block; margin-bottom: 8px; font-size: 13px">显示文字（最多 4 个字符）</NText>
          <NInput v-model:value="editText" placeholder="如：OD" maxlength="4" />
        </div>
        <div>
          <NText depth="3" style="display: block; margin-bottom: 8px; font-size: 13px">背景颜色</NText>
          <NColorPicker
            v-model:value="editColor"
            :show-alpha="false"
            :swatches="['#c39fd9', '#2080f0', '#18a058', '#f0a020', '#d03050', '#3867d6', '#0fb9b1', '#909399']"
          />
        </div>
        <div style="display: flex; justify-content: center">
          <div class="profile-badge profile-badge--preview" :style="{ background: editColor }">
            {{ editText.trim().slice(0, 4) || 'OD' }}
          </div>
        </div>
      </NSpace>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showAvatarModal = false">取消</NButton>
          <NButton type="primary" @click="saveAvatar">保存</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.app-shell {
  height: 100vh;
  overflow: hidden;
  background: #f5f6f8;
}

.floating-sidebar {
  position: fixed;
  top: 24px;
  bottom: 24px;
  left: 24px;
  z-index: 20;
  width: 68px;
  padding: 14px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 26px;
  background: rgba(250, 250, 250, 0.94);
  border: 1px solid rgba(17, 24, 39, 0.05);
  box-shadow:
    0 12px 28px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
}

.brand-button,
.nav-button {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.brand-button {
  color: #1c1728;
  background: transparent;
}

.nav-group {
  width: 100%;
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.nav-button {
  color: #272132;
  background: rgba(255, 255, 255, 0.92);
  box-shadow:
    0 8px 20px rgba(48, 35, 20, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
}

.nav-button:hover {
  transform: translateY(-1px);
  box-shadow:
    0 12px 24px rgba(48, 35, 20, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
}

.nav-button--active {
  color: #fff;
  background: #14111d;
  box-shadow: 0 16px 30px rgba(20, 17, 29, 0.25);
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 10px;
}

.profile-badge {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #fff;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.profile-badge:hover {
  opacity: 0.85;
}

.profile-badge--preview {
  width: 56px;
  height: 56px;
  font-size: 16px;
  cursor: default;
}

.profile-badge--preview:hover {
  opacity: 1;
}

.app-content {
  height: 100%;
  padding: 24px 20px 24px 96px;
  box-sizing: border-box;
  overflow: hidden;
}

@media (max-width: 900px) {
  .floating-sidebar {
    left: 16px;
    width: 62px;
    padding-inline: 7px;
  }

  .app-content {
    padding-left: 86px;
  }

  .brand-button,
  .nav-button {
    width: 36px;
    height: 36px;
  }
}
</style>
