<script setup lang="ts">
const emit = defineEmits<{
  select: [region: { x: number; y: number; width: number; height: number }]
  cancel: []
}>()

async function activate() {
  const region = await window.muerzhiAPI.selectRegion()
  if (region) {
    emit('select', region)
  } else {
    emit('cancel')
  }
}

defineExpose({ activate })
</script>

<template>
  <!-- 全屏选区由 Rust 侧透明置顶窗（region-selector.html）处理，此处无 DOM -->
</template>
