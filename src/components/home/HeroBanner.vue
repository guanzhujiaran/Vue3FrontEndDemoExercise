<template>
  <section class="hero-banner">
    <div class="hero-content">
      <h1 class="hero-title">BiliExplosion</h1>
      <p class="hero-subtitle">B站抽奖数据分析与管理平台，但不限于B站</p>
      <div class="hero-actions">
        <el-button type="primary" size="large" @click="handleLoginClick" v-if="!isLoggedIn">
          <el-icon class="el-icon--left">
            <IconUser />
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
            <IconDataAnalysis />
          </el-icon>
          查看抽奖数据
        </el-button>
        <el-button type="info" size="large" @click="router.push('/app/Feedback')">
          <el-icon class="el-icon--left">
            <IconChat />
          </el-icon>
          提交反馈
        </el-button>
      </div>
    </div>
    <div class="hero-stats" v-if="isLoggedIn"></div>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElButton, ElIcon } from 'element-plus'
import {
  User as IconUser,
  DataAnalysis as IconDataAnalysis,
  ChatLineRound as IconChat
} from '@element-plus/icons-vue'

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

<style scoped>
/* 顶部横幅 */
.hero-banner {
  background: linear-gradient(135deg, var(--el-color-danger) 0%, var(--el-color-info) 100%);
  padding: 60px 20px;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.hero-banner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.3;
}

.hero-content {
  max-width: 800px;
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.hero-subtitle {
  font-size: 20px;
  margin-bottom: 32px;
  opacity: 0.9;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 24px;
}

.hero-stats {
  display: flex;
  gap: 40px;
  margin-top: 32px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .hero-stats {
    flex-direction: column;
    gap: 20px;
  }
}
</style>