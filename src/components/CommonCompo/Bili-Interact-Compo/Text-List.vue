<template>
  <div class="text-list">
    <label v-for="(prop, i) in props.text_props" v-bind:key="i" class="type-input text-inputer">
      {{ prop.label }}
      <textarea
        v-if="is_array"
        v-no-space
        @input="() => (props.value = Array.from(props.value.split(',')))"
        :readonly="prop.readonly"
        :placeholder="prop.placeholder"
        class="input-text"
        v-model="props.value"
      ></textarea>
      <input
        v-else
        class="input-text"
        v-model="props.value"
        :placeholder="prop.placeholder"
        maxlength="32"
        v-no-space
        @input="props.value = props.value.replaceAll(/\s+/g, ``)"
        :readonly="prop.readonly"
      />
    </label>
  </div>
</template>
<script setup lang="ts">
import type { BaseSettingTextList } from '@/models/base/base_setting_model'
import { computed, type DirectiveBinding, ref } from 'vue'
const test_ref = ref('1145144')
const props = defineModel<BaseSettingTextList>({
  required: true
})
const is_array = computed(() => Array.isArray(props.value.value))
const vNoSpace = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    el.addEventListener('input', (event: Event) => {
      const target = event.target as HTMLInputElement
      if (target) {
        target.value = target.value.replace(/\s+/g, '')
        // 如果需要确保Vue的响应式系统能感知到变化，根据情况考虑是否需要手动触发input事件
        // target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })
  }
}
</script>