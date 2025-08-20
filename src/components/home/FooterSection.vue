<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-section">
        <h3>关于我们</h3>
        <p>
          BiliExplosion是一个帮助B站用户管理和分析抽奖数据的工具，提供多种功能帮助您更好地参与B站活动。
        </p>
      </div>
      <div class="footer-section">
        <h3>快速链接</h3>
        <ul>
          <li><a @click="router.push('/app/Feedback')">反馈建议</a></li>
          <li><a @click="router.push('/app/user-center')">用户中心</a></li>
          <li><a @click="router.push('/app/lot-data/bili-data/official')">抽奖数据</a></li>
        </ul>
      </div>
      <div class="footer-section">
        <h3>联系我一个人</h3>
        <p>邮箱: guanzhujiaran2022@163.com</p>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2025 BiliExplosion</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
.footer {
  background-color: #303133;
  color: #909399;
  margin-top: 60px;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 40px;
}

.footer-section h3 {
  color: #e6e6e6;
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
}

.footer-section p {
  line-height: 1.6;
}

.footer-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-section ul li {
  margin-bottom: 8px;
}

.footer-section ul li a {
  color: #909399;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s;
}

.footer-section ul li a:hover {
  color: #41b883;
}

.footer-bottom {
  background-color: #252525;
  text-align: center;
  padding: 16px;
  font-size: 14px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .footer-content {
    grid-template-columns: 1fr;
  }
}
</style>