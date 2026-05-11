<script setup lang="ts">
const emit = defineEmits<{
  select: [region: { x: number; y: number; width: number; height: number }]
  cancel: []
}>()

async function activate() {
  const region = await window.electronAPI.selectRegion()
  if (region) {
    emit('select', region)
  } else {
    emit('cancel')
  }
}

defineExpose({ activate })
</script>

<template>
  <!-- 全屏选区由 Electron 主进程窗口处理，此处无 DOM -->
</template>
