<template>

    <div class="radio-list" v-if="props"><label v-for="(radio_prop, i) in props.radio_props" v-bind:key="i"
            class="type-selector radio-selector">
            <input type="radio" class="radio" v-model="props.value" :value="radio_prop.value">
            <svg viewBox="0 0 40 40" class="radio-icon"
                :class="radio_prop.value == props.value ? `css-o1815x` : `css-1xneiug`">
                <path class="content"
                    d="M20,0h0A20,20,0,0,1,40,20h0A20,20,0,0,1,20,40h0A20,20,0,0,1,0,20H0A20,20,0,0,1,20,0Z"></path>
                <path class="border"
                    d="M2.5,20A17.5,17.5,0,1,0,20,2.5,17.51,17.51,0,0,0,2.5,20ZM0,20A20,20,0,1,1,20,40,20,20,0,0,1,0,20Z">
                </path>
                <path class="dot"
                    d="M20,10h0A10,10,0,0,1,30,20h0A10,10,0,0,1,20,30h0A10,10,0,0,1,10,20h0A10,10,0,0,1,20,10Z">
                </path>
            </svg>{{ radio_prop.content }}</label>
    </div>

    <!-- 测试用代码 -->
    <!-- <div>
        {{ props }}
    </div> -->

</template>

<script setup lang="ts">
import type { BaseSettingRadioList } from '@/models/base/base_setting_model';


const props = defineModel<BaseSettingRadioList>()

</script>
<style>
.config .radio-list {
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -ms-flex-wrap: wrap;
    flex-wrap: wrap;
}

.type-selector .radio-icon {
    position: absolute;
    top: 0;
    left: 0;
    font-size: 22px;
}

.css-1xneiug {
    fill: currentcolor;
    width: 1em;
    height: 1em;
}


svg:not(:root) {
    overflow-clip-margin: content-box;
    overflow: hidden;
}

.config .radio-selector {
    display: block;
    line-height: 22px;
    width: auto !important;
}


.type-selector {
    width: 50%;
    cursor: pointer;
    margin-top: 20px;
    position: relative;
}

.radio-selector {
    display: block;
    line-height: 22px;
    width: auto !important;
    color: #222;
}

:not(svg) {
    transform-origin: 0px 0px;
}

.css-1xneiug .content {
    fill: rgb(227, 232, 236);
    fill-opacity: 0.3;
}


.css-1xneiug .border {
    fill: rgb(208, 215, 221);
}

.css-1xneiug .dot {
    fill: none;
}

.css-o1815x {
    fill: currentcolor;
    width: 1em;
    height: 1em;
}

.css-o1815x .content {
    fill: none;
}

.css-o1815x .border,
.css-o1815x .dot {
    fill: rgb(35, 173, 229);
}

.css-o1815x .border,
.css-o1815x .dot {
    fill: rgb(35, 173, 229);
}
</style>