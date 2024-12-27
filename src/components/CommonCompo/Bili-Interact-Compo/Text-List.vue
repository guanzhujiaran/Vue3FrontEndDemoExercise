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
        type="text"
        class="input-text"
        v-model="props.value"
      ></textarea>
      <input
        v-else
        type="text"
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
<style scoped>
.text-list textarea {
  margin-top: 16px;
  display: block;
  position: relative;
  width: 100%; /* 初始宽度 */
  height: 80px; /* 初始高度 */
  transition: all 0.3s ease;
  border: 1px solid #e3e5e7;
  border-radius: 6px;
  background-color: #f1f2f3;
  overflow-x: hidden;
  unicode-bidi: isolate;
  line-height: 32px;
  resize: none;
  outline: none;
}

.text-list textarea:focus {
  height: 100px; /* 焦点时的高度 */
  background-color: transparent;
}

.text-list input:focus {
  width: 100%;
  background-color: transparent;
}

.text-list input {
  position: relative;
  height: 100%;
  width: 20%;
  min-width: 3rem;
  transition: 0.2s;
  border: 1px solid #e3e5e7;
  border-radius: 6px;
  background-color: #f1f2f3;
  overflow-x: hidden;
  margin: 0;
  padding: 0;
  unicode-bidi: isolate;
}

.text-list input:hover,
textarea:hover {
  background-color: transparent;
}

.text-list input:focus {
  width: fit-content;
  background-color: transparent;
}
</style>
