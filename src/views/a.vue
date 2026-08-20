<template>
    <div class="sidenav-test">
        <!-- 测试 BiliSideNavLayout：堆满内容验证 整页无滚动条 / 侧边栏铺满 / 仅内部滚动 -->
        <BiliSideNavLayout :nav-groups="navGroups" :collapsible="true">
            <template #header-extra>
                <el-button type="primary" size="default">测试按钮</el-button>
            </template>

            <!-- 内容区：堆满大量卡片，验证内容区 el-scrollbar 内部滚动 -->
            <div class="sidenav-test__content grid gap-3">
                <el-card v-for="n in 60" :key="n" class="sidenav-test__card">
                    <template #header>
                        <span class="font-bold">卡片 #{{ n }}</span>
                    </template>
                    <p class="text-text-secondary">
                        这是用于测试 BiliSideNavLayout 内容区滚动的第 {{ n }} 张卡片。侧边栏应铺满整个剩余高度，
                        整页不应出现外部滚动条，内容只在本区域内滚动。
                    </p>
                </el-card>
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
    Setting
} from '@element-plus/icons-vue'
import BiliSideNavLayout from '@/components/CommonCompo/Bili-Container-Compo/BiliSideNavLayout.vue'

// 多组菜单：模拟消息中心完整长列表 + 动态/审核分组，验证侧边栏内容多时自身内部滚动、且铺满整个剩余高度
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
