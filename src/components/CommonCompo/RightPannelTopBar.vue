<template>
    <div class="space-right-top">
        <div class="title">
            <div><!----><!----><span>{{ props.title }}</span></div><!---->
        </div>
    </div>
</template>
<script setup lang="ts">

const props = defineProps({
    title: {
        type: String,
        default: "",
    }
})
</script>

<style scoped>
@import '@/assets/components/container/right-pannel-top-bar-tailwind.css';
</style>