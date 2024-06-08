<template>
    <Transition name="bounce">
        <div v-show="props?.is_show" class="reply-box-send" :class="props?.is_active ? `send-active` : ``">
            <div class="send-text">{{ props?.btn_text }}</div>
        </div>
    </Transition>
</template>
<script setup lang="ts">

const props = defineModel<{
    btn_text: string,
    is_active: boolean,
    is_show: boolean,
}>()
</script>
<style>
.bounce-enter-active {
    animation: bounce-in 0.3s;
}

.bounce-leave-active {
    animation: bounce-in 0.3s reverse;
}

@keyframes bounce-in {
    0% {
        transform: scale(0);
    }


    100% {
        transform: scale(1);
    }
}

.reply-box-send:hover,
.reply-box-send .send-active {

    background-color: #1890ff;
}

.reply-box-send .send-text {
    position: absolute;
    z-index: 1;
    font-size: 16px;
    color: #FFFFFF;
}


.reply-box-send {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    width: 70px;
    height: 32px;
    border-radius: 6px;
    cursor: pointer;
    transition: all .2s ease-in-out;
    background-color: #00AEEC;
}
</style>