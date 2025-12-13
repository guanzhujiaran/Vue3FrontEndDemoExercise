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
          <li><router-link to="/app/Feedback">反馈建议</router-link></li>
          <li><router-link to="/app/user-center">用户中心</router-link></li>
          <li><router-link to="/app/lot-data/bili-data/official">抽奖数据</router-link></li>
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
// 不再需要导入 useRouter，因为我们使用了 RouterLink 组件
</script>

<style scoped>
@import '@/assets/components/layout/footer-section-tailwind.css';
</style>