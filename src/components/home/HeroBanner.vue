<template>
  <section class="relative flex flex-col items-center overflow-hidden bg-gradient-hero-primary py-12 px-4 text-center text-white">
    <div class="relative z-10 max-w-80">
      <h1 class="mb-5 text-4xl font-bold drop-shadow-lg md:text-5xl">BiliExplosion</h1>
      <p class="mb-10 text-lg opacity-90 md:text-xl">B站抽奖数据分析与管理平台,但不限于B站</p>
      <div class="mb-8 flex flex-wrap justify-center gap-5 md:flex-row md:justify-center">
        <el-button type="primary" size="large" @click="handleLoginClick" v-if="!isLoggedIn">
          <el-icon class="el-icon--left">
            <User />
          </el-icon>
          立即登录
        </el-button>
        <el-button
          type="success"
          size="large"
          @click="router.push('/app/lot-data/bili-data/official')"
          v-else
        >
          <el-icon class="el-icon--left">
            <DataAnalysis />
          </el-icon>
          查看抽奖数据
        </el-button>
        <el-button type="info" size="large" @click="router.push('/app/Feedback')">
          <el-icon class="el-icon--left">
            <ChatLineRound />
          </el-icon>
          提交反馈
        </el-button>
      </div>
    </div>
    <div class="mt-10 flex gap-12 md:flex-row md:justify-center" v-if="isLoggedIn"></div>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElButton, ElIcon } from 'element-plus'

interface Props {
  isLoggedIn: boolean
}

interface Emits {
  (e: 'loginClick'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()

const handleLoginClick = () => {
  emit('loginClick')
}
</script>