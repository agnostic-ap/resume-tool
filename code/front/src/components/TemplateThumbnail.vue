<script setup lang="ts">
defineProps<{ type: 'classic' | 'modern' | 'sidebar'; color: string }>()
</script>

<template>
  <!-- Classic: centered header + vertical sections -->
  <svg v-if="type === 'classic'" viewBox="0 0 44 60" width="44" height="60" xmlns="http://www.w3.org/2000/svg">
    <rect width="44" height="60" rx="2" fill="white" stroke="#e5e7eb" stroke-width="0.8"/>
    <rect x="11" y="5" width="22" height="2.5" rx="1.25" fill="#374151"/>
    <rect x="7"  y="9" width="30" height="1.5" rx="0.75" fill="#9ca3af"/>
    <rect x="4"  y="13.5" width="36" height="1.5" rx="0.5" :fill="color"/>
    <!-- s1 -->
    <rect x="4"  y="17" width="12" height="1.5" rx="0.75" :fill="color" opacity="0.75"/>
    <rect x="4"  y="20" width="36" height="1" rx="0.5" fill="#d1d5db"/>
    <rect x="4"  y="22.5" width="28" height="1" rx="0.5" fill="#d1d5db"/>
    <rect x="4"  y="25" width="32" height="1" rx="0.5" fill="#d1d5db"/>
    <!-- s2 -->
    <rect x="4"  y="29" width="12" height="1.5" rx="0.75" :fill="color" opacity="0.75"/>
    <rect x="4"  y="32" width="36" height="1" rx="0.5" fill="#d1d5db"/>
    <rect x="4"  y="34.5" width="24" height="1" rx="0.5" fill="#d1d5db"/>
    <!-- s3 -->
    <rect x="4"  y="38" width="12" height="1.5" rx="0.75" :fill="color" opacity="0.75"/>
    <rect x="4"  y="41" width="36" height="1" rx="0.5" fill="#d1d5db"/>
    <rect x="4"  y="43.5" width="20" height="1" rx="0.5" fill="#d1d5db"/>
  </svg>

  <!-- Modern: colored header + sidebar left + main right -->
  <svg v-else-if="type === 'modern'" viewBox="0 0 44 60" width="44" height="60" xmlns="http://www.w3.org/2000/svg">
    <rect width="44" height="60" rx="2" fill="white" stroke="#e5e7eb" stroke-width="0.8"/>
    <!-- Header bar -->
    <rect width="44" height="16" rx="2" :fill="color"/>
    <rect x="4"  y="5" width="18" height="2" rx="1" fill="white" opacity="0.9"/>
    <rect x="4"  y="9" width="26" height="1.5" rx="0.75" fill="white" opacity="0.6"/>
    <!-- Sidebar -->
    <rect x="0" y="16" width="14" height="44" fill="#f1f5f9"/>
    <rect x="2"  y="19" width="9" height="1.2" rx="0.6" :fill="color" opacity="0.7"/>
    <rect x="2"  y="21.5" width="10" height="1" rx="0.5" fill="#cbd5e1"/>
    <rect x="2"  y="23.5" width="8"  height="1" rx="0.5" fill="#cbd5e1"/>
    <rect x="2"  y="27"   width="9"  height="1.2" rx="0.6" :fill="color" opacity="0.7"/>
    <rect x="2"  y="29.5" width="10" height="1" rx="0.5" fill="#cbd5e1"/>
    <rect x="2"  y="31.5" width="7"  height="1" rx="0.5" fill="#cbd5e1"/>
    <!-- Main -->
    <rect x="16" y="19" width="14" height="1.5" rx="0.75" :fill="color" opacity="0.75"/>
    <rect x="16" y="22" width="26" height="1" rx="0.5" fill="#d1d5db"/>
    <rect x="16" y="24.5" width="20" height="1" rx="0.5" fill="#d1d5db"/>
    <rect x="16" y="27" width="22" height="1" rx="0.5" fill="#d1d5db"/>
    <rect x="16" y="31" width="14" height="1.5" rx="0.75" :fill="color" opacity="0.75"/>
    <rect x="16" y="34" width="26" height="1" rx="0.5" fill="#d1d5db"/>
    <rect x="16" y="36.5" width="18" height="1" rx="0.5" fill="#d1d5db"/>
  </svg>

  <!-- Sidebar: colored sidebar left + main right -->
  <svg v-else viewBox="0 0 44 60" width="44" height="60" xmlns="http://www.w3.org/2000/svg">
    <rect width="44" height="60" rx="2" fill="white" stroke="#e5e7eb" stroke-width="0.8"/>
    <!-- Sidebar bg -->
    <rect width="15" height="60" rx="2" :fill="color"/>
    <!-- Avatar -->
    <circle cx="7.5" cy="9" r="4.5" fill="white" opacity="0.25"/>
    <rect x="2"  y="16" width="11" height="1.2" rx="0.6" fill="white" opacity="0.8"/>
    <rect x="2"  y="18.5" width="9"  height="1" rx="0.5" fill="white" opacity="0.5"/>
    <rect x="2"  y="22"   width="11" height="1.2" rx="0.6" fill="white" opacity="0.8"/>
    <rect x="2"  y="24.5" width="9"  height="1" rx="0.5" fill="white" opacity="0.5"/>
    <rect x="2"  y="27"   width="7"  height="1" rx="0.5" fill="white" opacity="0.5"/>
    <rect x="2"  y="31"   width="11" height="1.2" rx="0.6" fill="white" opacity="0.8"/>
    <rect x="2"  y="33.5" width="9"  height="1" rx="0.5" fill="white" opacity="0.5"/>
    <!-- Main -->
    <rect x="18" y="6"  width="14" height="1.5" rx="0.75" :fill="color" opacity="0.7"/>
    <rect x="18" y="9"  width="24" height="1" rx="0.5" fill="#d1d5db"/>
    <rect x="18" y="11.5" width="18" height="1" rx="0.5" fill="#d1d5db"/>
    <rect x="18" y="16" width="14" height="1.5" rx="0.75" :fill="color" opacity="0.7"/>
    <rect x="18" y="19" width="24" height="1" rx="0.5" fill="#d1d5db"/>
    <rect x="18" y="21.5" width="20" height="1" rx="0.5" fill="#d1d5db"/>
    <rect x="18" y="25" width="14" height="1.5" rx="0.75" :fill="color" opacity="0.7"/>
    <rect x="18" y="28" width="24" height="1" rx="0.5" fill="#d1d5db"/>
    <rect x="18" y="30.5" width="16" height="1" rx="0.5" fill="#d1d5db"/>
  </svg>
</template>
