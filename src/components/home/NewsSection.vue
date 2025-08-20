<template>
  <section class="news-section">
    <h2 class="section-title">最新动态</h2>
    <div class="news-container">
      <el-timeline>
        <el-timeline-item
          v-for="(activity, index) in 4"
          :key="index"
          :timestamp="'2025-08-' + (14 - index)"
          placement="top"
          :type="index === 0 ? 'primary' : 'success'"
        >
          <el-card>
            <h4>
              {{
                [
                  '新增山姆会员店信息查询',
                  '优化B站抽奖数据分析',
                  '修复用户中心设置问题',
                  '系统上线'
                ][index]
              }}
            </h4>
            <p>
              {{
                [
                  '新增山姆会员店商品信息查询功能，支持价格比较和库存查询',
                  '优化了B站抽奖数据分析算法，提高了中奖预测准确率',
                  '修复了用户中心设置无法保存的问题',
                  'BiliExplosion系统正式上线，欢迎使用'
                ][index]
              }}
            </p>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ElTimeline, ElTimelineItem, ElCard } from 'element-plus'
</script>

<style scoped>
.news-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  width: -webkit-fill-available;
}

.news-container {
  margin-top: 24px;
}

.section-title {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}
</style>