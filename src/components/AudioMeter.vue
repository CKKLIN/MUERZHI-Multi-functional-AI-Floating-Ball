<script setup lang="ts">
defineProps<{
  level: number
  label?: string
}>()
</script>

<template>
  <div class="audio-meter">
    <div class="meter-bars">
      <div
        v-for="i in 8"
        :key="i"
        :class="['meter-bar', { active: level * 8 >= i }]"
        :style="{ height: `${4 + i * 2}px` }"
      />
    </div>
    <span v-if="label" class="meter-label">{{ label }}</span>
  </div>
</template>

<style scoped>
.audio-meter {
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.meter-bars {
  display: flex;
  align-items: flex-end;
  gap: 1px;
  height: 20px;
}

.meter-bar {
  width: 3px;
  background: var(--bg-input);
  border-radius: 1px;
  transition: background 0.05s;
}

.meter-bar.active {
  background: var(--success);
}

.meter-bar.active:nth-child(n+6) {
  background: var(--warning);
}

.meter-bar.active:nth-child(n+8) {
  background: var(--accent);
}

.meter-label {
  font-size: 10px;
  color: var(--text-muted);
  margin-left: 2px;
}
</style>
