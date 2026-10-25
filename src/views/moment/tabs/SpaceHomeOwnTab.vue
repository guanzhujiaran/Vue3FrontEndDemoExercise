<template>
  <!-- 左栏内容流 + 右栏个人资料卡窄条。
       布局用 flex + Tailwind 断点而不是 el-splitter：splitter 只能横向/纵向两栏且要显式高度，
       小屏无法自动堆叠（会把左栏压到几十 px，正是之前「布局乱了」的成因）。
       全屏宽都保持左右分栏（对标 B 站空间：手机端也是「内容 + 右侧窄条」），
       右栏宽度随断点递进：144 / 256 / 288px（窄屏也要读得清，所以不再压到 96px）。 -->
  <div class="space-home-own-layout max-w-6xl mx-auto w-full flex flex-row items-start gap-3 md:gap-6 lg:gap-8">
    <section class="space-home-own__main flex-1 min-w-0 flex flex-col gap-6">
      <!-- 区块标题即入口：大字号 el-link，点进「时间线」tab（不再另放「查看全部」按钮） -->
      <header class="space-home-own__section-head">
        <el-link
          class="space-home-own__section-link text-xl font-bold"
          type="primary"
          underline="never"
          @click="goTimelineTab"
        >
          我的时间线
        </el-link>
      </header>
      <SpaceTimelineList :mid="spaceMid" :limit="PREVIEW_LIMIT" empty-text="最近还没有行为记录~" />
    </section>
    <!-- 右栏：个人资料卡窄条（对标 B 站：窄条只有图标 + 值，没有 KV 文案） -->
    <aside class="space-home-own__aside w-36 shrink-0 md:w-64 lg:w-72 sticky top-4">
      <SpaceProfileAside />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import SpaceTimelineList from '@/components/moment/SpaceTimelineList.vue'
import SpaceProfileAside from '@/components/moment/SpaceProfileAside.vue'
import { useMomentSpace } from '@/views/moment/tabs/spaceContext'

/**
 * 我的主页（自身空间落地页，2.58.0）。
 *
 * 与「TA 的主页」是两个独立页面组件（展示内容完全不同），分流点在布局壳
 * `MomentSpaceView.vue` 的 resolveTabComponent —— 本组件内不出现 isOwnSpace 分支。
 *
 * 数据总览（关注 / 粉丝 / 互关 / 获赞 / 动态）不在这里重复：布局壳头部已经展示同一份数据
 * （`SpaceInfoResp` 内联 `follow_stat` + `upstat`，且已按 B 站布局收进 tab 栏右侧）。
 *
 * 最近一次登录（日期 + IP 属地）由布局壳头部承载（昵称 / 等级之后），本页不再重复。
 *
 * 2.59.0：时间线只做**概览**（最近 `PREVIEW_LIMIT` 条），标题即入口，完整流水在「时间线」tab；
 * 布局为「左栏内容流 + 右栏个人资料卡」，小屏上下堆叠、≥lg 左右分栏（不再用 el-splitter 拖拽调宽，
 * 因为 splitter 无法在小屏堆叠，会把左栏压成极窄一条）。
 */
const { spaceMid } = useMomentSpace()
const router = useRouter()

/** 主页概览条数：够看清最近在做什么，又不把首屏撑长 */
const PREVIEW_LIMIT = 5

function goTimelineTab() {
  router.push({ name: 'MOMENT_USER_SPACE_TIMELINE', params: { mid: spaceMid.value } })
}
</script>