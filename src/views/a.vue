<template>
    <div class="sidenav-test">
        <!-- 测试 BiliSideNavLayout 空态：模拟管理页「标题 + 刷新按钮行 + 空占位符」，复现空态横向滚动条 -->
        <BiliSideNavLayout :nav-groups="navGroups" :collapsible="true">
            <div class="sidenav-test__page flex flex-col gap-4">
                <!-- 标题行 -->
                <div class="sidenav-test__toolbar flex items-center justify-between">
                    <h2 class="sidenav-test__title text-lg font-bold text-text-primary">通知管理</h2>
                    <el-button type="primary" size="default" class="sidenav-test__create">发布通知</el-button>
                </div>

                <!-- 表格紧上方的刷新按钮行 -->
                <div class="sidenav-test__table-bar mb-2 flex items-center justify-end">
                    <el-button class="sidenav-test__refresh-btn" size="default" :icon="Refresh">刷新</el-button>
                </div>

                <!-- 空态占位符（复现点：空占位符出现时横向滚动条出现），与真实管理页一致由 LoadingWrap 包裹 -->
                <LoadingWrap :loading="false">
                    <EmptyState text="暂无数据" />
                </LoadingWrap>
            </div>
        </BiliSideNavLayout>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import {
    ChatDotRound,
    ChatLineRound,
    Promotion,
    Pointer,
    Bell,
    Setting,
    Refresh
} from '@element-plus/icons-vue'
import BiliSideNavLayout from '@/components/CommonCompo/Bili-Container-Compo/BiliSideNavLayout.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import LoadingWrap from '@/components/message/LoadingWrap.vue'

const navGroups = computed(() => [
    {
        title: '消息',
        items: [
            { name: 'test-nav-1', title: '我的消息', icon: ChatDotRound, badge: true, badgeValue: 12 },
            { name: 'test-nav-2', title: '回复我的', icon: ChatLineRound, badge: true, badgeValue: 3 },
            { name: 'test-nav-3', title: '@ 我的', icon: Promotion, badge: true, badgeValue: 7 },
            { name: 'test-nav-4', title: '收到的赞', icon: Pointer, badge: true, badgeValue: 99 },
            { name: 'test-nav-5', title: '系统通知', icon: Bell, badge: true, badgeValue: 1 },
            { name: 'test-nav-6', title: '消息设置', icon: Setting, badge: false, badgeValue: 0 }
        ]
    },
    {
        title: '动态',
        items: [
            { name: 'test-nav-7', title: '动态广场', icon: ChatDotRound },
            { name: 'test-nav-8', title: '话题广场', icon: Promotion },
            { name: 'test-nav-9', title: '我的动态', icon: Pointer },
            { name: 'test-nav-10', title: '动态收藏', icon: Bell, badge: true, badgeValue: 5 },
            { name: 'test-nav-11', title: '浏览历史', icon: Setting }
        ]
    },
    {
        title: '管理',
        items: [
            { name: 'test-nav-12', title: '动态审核', icon: Pointer },
            { name: 'test-nav-13', title: '话题审核', icon: ChatDotRound },
            { name: 'test-nav-14', title: '评论审核', icon: ChatLineRound, badge: true, badgeValue: 23 },
            { name: 'test-nav-15', title: '私信审核', icon: Bell, badge: true, badgeValue: 6 },
            { name: 'test-nav-16', title: '头像审核', icon: Pointer },
            { name: 'test-nav-17', title: '封禁管理', icon: Setting },
            { name: 'test-nav-18', title: '权限管理', icon: Promotion },
            { name: 'test-nav-19', title: '操作日志', icon: ChatLineRound },
            { name: 'test-nav-20', title: '数据统计', icon: Pointer }
        ]
    }
])
</script>
