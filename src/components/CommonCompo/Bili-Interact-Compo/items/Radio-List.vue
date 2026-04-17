<template>
  <div class="radio-list">
    <span v-if="props.radio_props[0] && props.radio_props[0].label" class="self-center">{{
      props.radio_props[0] && props.radio_props[0].label
    }}</span>
    <label
      v-for="(radio_prop, i) in props.radio_props"
      v-bind:key="i"
      class="type-selector radio-selector"
    >
      <input type="radio" class="radio absolute opacity-0 z-10 w-5 h-5 cursor-pointer" v-model="props.value" :value="radio_prop.value" />
      <svg
        viewBox="0 0 40 40"
        class="radio-icon absolute top-0 left-0 w-5 h-5"
        :class="radio_prop.value == props.value ? `css-o1815x` : `css-1xneiug`"
      >
        <path
          class="content"
          d="M20,0h0A20,20,0,0,1,40,20h0A20,20,0,0,1,20,40h0A20,20,0,0,1,0,20H0A20,20,0,0,1,20,0Z"
        ></path>
        <path
          class="border"
          d="M2.5,20A17.5,17.5,0,1,0,20,2.5,17.51,17.51,0,0,0,2.5,20ZM0,20A20,20,0,1,1,20,40,20,20,0,0,1,0,20Z"
        ></path>
        <path
          class="dot"
          d="M20,10h0A10,10,0,0,1,30,20h0A10,10,0,0,1,20,30h0A10,10,0,0,1,10,20h0A10,10,0,0,1,20,10Z"
        ></path>
      </svg>
      <span class="radio-label ml-2 align-middle">{{ radio_prop.content }}</span>
    </label>
  </div>
</template>

<script setup lang="ts">
import type { BaseSettingRadioList } from '@/models/base/base_setting_model'

const props = defineModel<BaseSettingRadioList>({ required: true })
</script>
