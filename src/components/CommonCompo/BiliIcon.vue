<template>
  <component :is="iconComponent" class="bili-icon" :class="iconClass" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LikeIcon from '@/assets/svgs/like.svg?component'
import LikeActiveIcon from '@/assets/svgs/like_active.svg?component'
import DislikeIcon from '@/assets/svgs/dislike.svg?component'
import DislikeActiveIcon from '@/assets/svgs/dislike_active.svg?component'
import FavoriteIcon from '@/assets/svgs/dynamic/detail/side_toolbar/favorite.svg?component'
import ForwardIcon from '@/assets/svgs/dynamic/detail/side_toolbar/forward.svg?component'
import CommentIcon from '@/assets/svgs/dynamic/detail/side_toolbar/comment.svg?component'

/** 图标名 → SVG 组件（静态 import，导入写在文件头） */
const ICONS = {
  like: LikeIcon,
  likeActive: LikeActiveIcon,
  dislike: DislikeIcon,
  dislikeActive: DislikeActiveIcon,
  favorite: FavoriteIcon,
  forward: ForwardIcon,
  comment: CommentIcon,
} as const

/**
 * 统一业务图标组件（点赞 / 点踩 / 收藏 / 转发 / 评论）。
 *
 * 为什么需要它：`assets/svgs/**` 已全部归一化为 `width/height="100%"` +
 * `fill="currentColor"`，即「一份资源、外部染色」——SVG 的 `fill` 是继承属性，
 * 且 CSS 声明优先级高于 presentation attribute，所以：
 * - 外部 `text-*`（color）→ 经 currentColor 变成 fill；
 * - 外部 `fill-*`（Tailwind fill 工具类）→ 直接覆盖，CSS 胜出。
 * 组件再兜底一层 `fill-current`，即使将来新增的 svg 漏写 currentColor 也不会渲染成黑块。
 *
 * 用法（尺寸与颜色全交给 class，一处不重复）：
 * ```vue
 * <BiliIcon name="like" :class="isLiked ? 'text-msg-pink' : ''" />
 * ```
 * 业务侧不再重复写 `el-icon` + `?component` + `w-full h-full`，
 * 也不必为「未激活 / 激活」各准备一份资源。
 */
const props = withDefaults(
  defineProps<{
    /** 图标名（对应 ICONS 映射表） */
    name: keyof typeof ICONS
    /** 缺省尺寸 class（外部可用 class 覆盖，如 `w-5 h-5`） */
    size?: string
    /** 是否强制 fill-current（默认开启，保证外部 text 类与 fill 类都能染色） */
    currentFill?: boolean
  }>(),
  {
    size: 'w-4 h-4',
    currentFill: true,
  }
)

const iconComponent = computed(() => ICONS[props.name])

/** 尺寸 + 染色兜底；外部 class 由 Vue 自动合并到根元素 */
const iconClass = computed(() => [props.size, props.currentFill ? 'fill-current' : ''])
</script>