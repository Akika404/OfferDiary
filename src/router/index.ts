import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'pipeline',
        component: () => import('@/views/PipelineView.vue')
      },
      {
        path: 'calendar',
        name: 'calendar',
        component: () => import('@/views/CalendarView.vue')
      },
      {
        path: 'company/:id',
        name: 'company-detail',
        component: () => import('@/views/CompanyDetail.vue')
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
