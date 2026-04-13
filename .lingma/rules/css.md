---
trigger: always_on
---

## CSS 样式规范

### 1. 变量来源与使用

- **禁止硬编码**：颜色和尺寸必须从 `src/assets/tailwind.css` 中获取，禁止在组件局部样式中硬编码像素值或颜色值。
- **颜色变量**：使用 `var(--el-color-*)` 系列变量（如 `var(--el-color-primary)`）。
- **尺寸变量**：优先使用 `.size-*` 类名（如 `.size-sm`、`.size-md`），或使用对应的 `--component-*` 变量。

### 2. 变量定义规范

- **禁止局部定义**：禁止在非全局的局部 CSS（`<style scoped>`）中直接定义新的 `var()` 变量。
- **全局定义位置**：新增的全局变量应定义在 `src/assets/tailwind.css` 的适当层级：
  - 优先选择 `components` 或 `utilities` 层
  - 仅在基础重置场景下使用 `base` 层
- **命名规范**：遵循 `内容-类别-等级` 的命名结构（例如 `--el-color-primary-light-3`），确保变量名语义清晰且易于维护。

### 3. 代码生成影响

- 如果向 `base` 层添加了新类别，需要同步更新随机样式生成逻辑（如果存在相关工具链）和调整ui大小的功能。
