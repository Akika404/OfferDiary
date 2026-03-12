<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { NText, NTag } from 'naive-ui'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useInterviewStore } from '@/stores/interview'

const props = defineProps<{ interviewId: string }>()

const interviewStore = useInterviewStore()
const saving = ref(false)
const lastSaved = ref<string>('')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: '在这里记录面试内容... 支持 Markdown 快捷键'
    })
  ],
  content: '',
  onUpdate: () => {
    scheduleSave()
  }
})

function scheduleSave() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    saveContent()
  }, 1000)
}

function saveContent() {
  if (!editor.value) return
  const html = editor.value.getHTML()
  interviewStore.updateInterview(props.interviewId, { content: html })
  saving.value = false
  lastSaved.value = new Date().toLocaleTimeString()
}

onMounted(() => {
  const interview = interviewStore.getInterviewById(props.interviewId)
  if (interview?.content && editor.value) {
    editor.value.commands.setContent(interview.content)
  }
})

watch(() => props.interviewId, (newId) => {
  const interview = interviewStore.getInterviewById(newId)
  if (editor.value) {
    editor.value.commands.setContent(interview?.content || '')
  }
})

onBeforeUnmount(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    saveContent()
  }
  editor.value?.destroy()
})
</script>

<template>
  <div>
    <div class="editor-toolbar" v-if="editor">
      <button
        :class="{ active: editor.isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()"
        title="加粗"
      >B</button>
      <button
        :class="{ active: editor.isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()"
        title="斜体"
      ><em>I</em></button>
      <button
        :class="{ active: editor.isActive('heading', { level: 2 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
        title="标题"
      >H</button>
      <button
        :class="{ active: editor.isActive('bulletList') }"
        @click="editor.chain().focus().toggleBulletList().run()"
        title="无序列表"
      >•</button>
      <button
        :class="{ active: editor.isActive('orderedList') }"
        @click="editor.chain().focus().toggleOrderedList().run()"
        title="有序列表"
      >1.</button>
      <button
        :class="{ active: editor.isActive('codeBlock') }"
        @click="editor.chain().focus().toggleCodeBlock().run()"
        title="代码块"
      >&lt;/&gt;</button>
      <button
        @click="editor.chain().focus().setHorizontalRule().run()"
        title="分割线"
      >—</button>
      <span style="flex: 1"></span>
      <NTag v-if="lastSaved" size="tiny" :bordered="false" type="success">已保存 {{ lastSaved }}</NTag>
    </div>
    <EditorContent :editor="editor" class="editor-content" />
  </div>
</template>

<style scoped>
.editor-toolbar {
  display: flex;
  gap: 4px;
  padding: 8px;
  border: 1px solid #e8e8e8;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  background: #fafafa;
  align-items: center;
}

.editor-toolbar button {
  padding: 4px 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  line-height: 1.4;
}

.editor-toolbar button:hover {
  background: #e8e8e8;
}

.editor-toolbar button.active {
  background: #e0e0e0;
  border-color: #ccc;
}

.editor-content {
  border: 1px solid #e8e8e8;
  border-radius: 0 0 8px 8px;
  min-height: 200px;
}

:deep(.tiptap) {
  padding: 12px 16px;
  min-height: 200px;
  outline: none;
  font-size: 14px;
  line-height: 1.7;
}

:deep(.tiptap p.is-editor-empty:first-child::before) {
  color: #aaa;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

:deep(.tiptap h2) {
  font-size: 18px;
  margin: 12px 0 8px;
}

:deep(.tiptap ul),
:deep(.tiptap ol) {
  padding-left: 24px;
}

:deep(.tiptap code) {
  background: #f0f0f0;
  border-radius: 3px;
  padding: 2px 4px;
  font-size: 13px;
}

:deep(.tiptap pre) {
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 6px;
  padding: 12px 16px;
  font-size: 13px;
  overflow-x: auto;
}

:deep(.tiptap hr) {
  border: none;
  border-top: 1px solid #e8e8e8;
  margin: 16px 0;
}
</style>
