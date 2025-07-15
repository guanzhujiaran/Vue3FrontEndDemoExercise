<template>
  <div ref="outerWrapperRef" class="scaling-outer-wrapper">
    <component
      :is="props.tag"
      ref="containerRef"
      class="proportional-scaling-container"
      :style="containerStyle"
    >
      <slot></slot>
    </component>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type StyleValue, nextTick } from 'vue'
import { useDebounceFn } from '@vueuse/core' // Optional: for debouncing resize

// --- Define Component Props ---
interface Props {
  /**
   * The HTML tag to use for the container element itself.
   * @default 'div'
   */
  tag?: string

  /**
   * The minimum width (in pixels) before scaling down begins.
   * @default 1000
   */
  minWidth?: number

  /**
   * The maximum width (in pixels) before scaling up begins.
   * @default 1920
   */
  maxWidth?: number

  /**
   * Horizontal padding (left and right) inside the container *at its base size*.
   * Examples: '1rem', '15px'. This padding will also scale.
   * @default '1rem'
   */
  paddingX?: string

  /**
   * Vertical padding (top and bottom) inside the container *at its base size*.
   * Examples: '1rem', '15px'. This padding will also scale.
   * @default '0'
   */
  paddingY?: string

  /**
   * Transform origin for scaling. Default 'center top' often works well.
   * Examples: 'top left', 'center center'
   * @default 'center top'
   */
  transformOrigin?: string

  /**
   * Debounce time in ms for the resize handler to improve performance.
   * Set to 0 to disable debouncing.
   * @default 100
   */
  resizeDebounceMs?: number
}

// --- Set Default Prop Values ---
const props = withDefaults(defineProps<Props>(), {
  tag: 'div',
  minWidth: 800,
  maxWidth: 1920,
  paddingX: '0',
  paddingY: '0',
  transformOrigin: 'center top',
  resizeDebounceMs: 100 // Debounce resize checks slightly
})

// --- Refs ---
const containerRef = ref<HTMLElement | null>(null)
const outerWrapperRef = ref<HTMLElement | null>(null) // Ref for the centering wrapper
const scaleFactor = ref(1) // Reactive scale factor
const baseWidth = ref<number | null>(null) // Store the width used when scale is 1

// --- Logic for Calculating Scale ---
const updateScale = () => {
  // Use window.innerWidth as the reference viewport width
  const viewportWidth = window.innerWidth

  let newScale = 1
  let currentBaseWidth = props.maxWidth // Assume max width initially

  if (viewportWidth < props.minWidth) {
    newScale = viewportWidth / props.minWidth
    currentBaseWidth = props.minWidth // Base width when scaling down is the min threshold
  } else if (viewportWidth > props.maxWidth) {
    newScale = viewportWidth / props.maxWidth
    currentBaseWidth = props.maxWidth // Base width when scaling up is the max threshold
  } else {
    // Between min and max, scale is 1. Base width should match viewport or maxWidth.
    newScale = 1
    currentBaseWidth = Math.min(viewportWidth, props.maxWidth)
    // Alternatively, always set base to maxW and let it center?
    // currentBaseWidth = props.maxWidth; // simpler? Try this if centering fails
  }

  scaleFactor.value = newScale
  baseWidth.value = currentBaseWidth // Store the width that corresponds to scale=1 (or the threshold width)

  // Optional: Adjust centering dynamically if needed (might not be necessary with wrapper)
  // console.log(`Viewport: ${viewportWidth}, Scale: ${newScale.toFixed(3)}, BaseWidth: ${baseWidth.value}`);
}

// Debounce the update function if requested
const debouncedUpdateScale =
  props.resizeDebounceMs > 0 ? useDebounceFn(updateScale, props.resizeDebounceMs) : updateScale

// --- Computed Styles ---
const containerStyle = computed<StyleValue>(() => ({
  // Set the logical base width for layout before scaling
  // It should try to fill available space up to maxWidth when scale is 1
  // When scaling, it should be fixed at the threshold width (min or max)
  width:
    scaleFactor.value === 1
      ? `min(100%, ${props.maxWidth}px)` // Standard responsive width within range
      : `${baseWidth.value}px`, // Fixed width when scaling

  // Apply the calculated scale transform
  transform: `scale(${scaleFactor.value})`,
  transformOrigin: props.transformOrigin,

  // Apply base padding (will be scaled visually)
  paddingLeft: props.paddingX,
  paddingRight: props.paddingX,
  paddingTop: props.paddingY,
  paddingBottom: props.paddingY,

  // Necessary for centering within the wrapper when scale is 1 and width < wrapper width
  marginLeft: scaleFactor.value === 1 ? 'auto' : undefined, // Auto margins only when not scaled
  marginRight: scaleFactor.value === 1 ? 'auto' : undefined

  // Explicit min/max width *could* interfere with scaling, often better handled by the scale logic itself.
  // We set the base width dynamically instead.
  // minWidth: `${props.minWidth}px`, // CSS min-width
  // maxWidth: `${props.maxWidth}px`, // CSS max-width
}))

// --- Lifecycle Hooks ---
onMounted(async () => {
  // Ensure DOM is ready before first calculation
  await nextTick()
  updateScale() // Initial calculation
  window.addEventListener('resize', debouncedUpdateScale)
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedUpdateScale)
})
</script>

<style scoped>
.scaling-outer-wrapper {
  /*
   * This wrapper helps center the scaled element.
   * It takes up the necessary width but doesn't scale itself.
   * It needs to allow overflow so the scaled content isn't clipped.
   */
  width: 100%;
  overflow-x: hidden; /* Be careful with this - might clip scaled content if origin isn't perfect */
  display: flex; /* Use flex to help center the inner container */
  justify-content: center; /* Center the flex item horizontally */
  background: transparent;
}

.proportional-scaling-container {
  box-sizing: border-box;
  background-color: var(--el-bg-color);
  flex-shrink: 0;
}
</style>
