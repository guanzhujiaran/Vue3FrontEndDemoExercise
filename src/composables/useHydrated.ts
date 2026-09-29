import { onMounted, ref, type Ref } from 'vue'

/**
 * 客户端是否已完成首次挂载（水合完成）。
 *
 * 服务端与客户端**首帧**均返回 `false`，`onMounted` 之后才翻转为 `true`。
 *
 * 背景：登录态来自 `useUserNavStore`（persist → localStorage），pinia 在客户端
 * 首次取用 store 时就会同步恢复，而 SSR / 预渲染阶段没有 localStorage，只能渲染
 * 「未登录」结构。若直接用它控制 `v-if` 分支，客户端首帧就会比服务端 HTML 多出
 * 节点，触发 `Hydration children mismatch`。
 *
 * 与 `stores/locale.ts` 的处理思路一致：先让两端首帧的结构相同（都按未登录渲染），
 * 挂载后再按真实登录态更新。这样登录后页面会有一帧的「未登录→已登录」切换，
 * 属于可接受的代价（首屏结构一致，无 hydration 报错）。
 *
 * @example
 * const isHydrated = useHydrated()
 * const isLoggedIn = computed(() => isHydrated.value && !!user_nav.value.uid)
 */
export function useHydrated(): Ref<boolean> {
  const isHydrated = ref(false)
  onMounted(() => {
    isHydrated.value = true
  })
  return isHydrated
}
