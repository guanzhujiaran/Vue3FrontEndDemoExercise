<template>
  <div class="debug-plugin-panel flex flex-col h-full bg-[var(--el-bg-color)]">
    <!-- 顶部工具栏 -->
    <div class="flex items-center gap-2 px-3 py-2 border-b border-[var(--el-border-color-lighter)] shrink-0 bg-[var(--el-fill-color-light)]">
      <span class="text-sm font-medium text-[var(--el-text-color-primary)]">插件调试</span>
      <div class="ml-auto flex items-center gap-2">
        <el-button size="small" type="primary" :icon="Plus" @click="openCreateDialog">新建插件</el-button>
        <el-button v-if="selectedPlugin && hasConfigChanges" size="small" type="success" :icon="FolderAdd" @click="savePluginConfig">保存配置</el-button>
        <el-button v-if="selectedPlugin && pluginHookList.length > 0" size="small" :icon="Connection" @click="openHookTestDialog">测试钩子</el-button>
        <el-button size="small" :loading="loading" @click="refreshPlugins"><el-icon><Refresh /></el-icon> 刷新</el-button>
        <el-tag size="small" type="info" effect="plain">{{ plugins.length }} 个插件</el-tag>
      </div>
    </div>

    <!-- 主内容区：左右分栏 -->
    <div class="flex-1 flex min-h-0 gap-3 p-3">
      <!-- 左侧插件列表区 -->
      <div class="w-56 flex flex-col gap-2 overflow-y-auto shrink-0 rounded-lg border border-[var(--el-border-color-lighter)] p-3">
        <!-- 插件卡片列表 -->
        <div
          v-for="plugin in plugins"
          :key="plugin._id || plugin.id"
          :class="['plugin-card', 'group', 'relative', 'p-2.5', 'rounded-lg', 'border', 'transition-all', 'cursor-pointer', cardClass(plugin)]"
          @click="selectPlugin(plugin)"
        >
          <!-- 关联钩子数量角标 -->
          <div class="absolute -top-1 -right-1 z-10">
            <el-tooltip
              v-if="pluginHookListMap[plugin._id || plugin.id]?.length > 0"
              :content="`已关联 ${pluginHookListMap[plugin._id || plugin.id].length} 个钩子`"
              placement="top"
            >
              <span
                :class="['inline-flex', 'items-center', 'justify-center', 'w-4', 'h-4', 'rounded-full', 'text-white', 'text-[9px]', 'font-bold', 'shadow-md', 'transition-all', 'duration-300', isTriggering(plugin) ? 'bg-purple-500 animate-pulse scale-125' : 'bg-purple-400']"
              >🧩</span>
            </el-tooltip>
          </div>

          <!-- 本地标签 -->
          <el-tag v-if="plugin._local" size="small" type="warning" effect="plain" class="!text-[11px] !absolute !-top-1 !-left-1 !z-10">本地</el-tag>

          <!-- 插件图标 + 名称 -->
          <div class="flex items-center gap-1.5 mb-1 pr-5">
            <el-icon :size="14" class="text-primary"><Box /></el-icon>
            <span class="text-xs font-medium truncate flex-1">{{ plugin.name }}</span>
          </div>

          <!-- 启用/禁用开关 + 版本号 -->
          <div class="flex items-center gap-1 mb-1">
            <el-switch v-model="plugin.active" size="small" @change="(val: boolean) => togglePluginStatus(plugin, val)" @click.stop />
            <el-tag v-if="plugin.version" size="small" type="info" effect="plain" class="!text-[13px]">v{{ plugin.version }}</el-tag>
          </div>

          <!-- Plugin ID -->
          <p class="text-[10px] text-[var(--el-text-color-placeholder)] m-0 truncate font-mono">{{ plugin.plugin_id }}</p>

          <!-- 关联动作提示（如果已设置） -->
          <p v-if="plugin.custom_action_id" class="text-[9px] text-blue-500 m-0 mt-0.5 truncate flex items-center gap-0.5">
            <el-icon :size="10"><VideoPlay /></el-icon>
            {{ plugin.custom_action_name || plugin.custom_action_id }}
          </p>

          <!-- 删除按钮（仅本地插件） -->
          <button
            v-if="plugin._local"
            class="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-500"
            @click.stop="removeLocalPlugin(plugin)"
          ><el-icon :size="12"><Close /></el-icon></button>
        </div>

        <!-- 空状态 -->
        <div v-if="plugins.length === 0 && !loading" class="space-y-3 py-4">
          <div class="text-center px-2">
            <p class="text-xs text-[var(--el-text-color-secondary)] mt-1 m-0 mb-2">➕ 还没有插件，创建一个开始调试</p>
            <el-button size="small" type="primary" :icon="Plus" @click="openCreateDialog">新建插件</el-button>
          </div>

          <!-- 模板快速创建 -->
          <div class="border-t border-dashed border-[var(--el-border-color-lighter)] pt-2">
            <p class="text-[12px] text-[var(--el-text-color-placeholder)] mb-1.5 m-0 text-center">或使用模板快速创建</p>
            <div class="grid grid-cols-3 gap-1">
              <el-button v-for="tpl in pluginTemplates" :key="tpl.id" size="small" text class="!text-[13px]" @click="createFromTemplate(tpl)">
                {{ tpl.icon }} {{ tpl.name }}
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧插件详情区 -->
      <div class="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
        <!-- 插件详情 -->
        <div v-if="selectedPlugin" class="rounded-lg border border-[var(--el-border-color-lighter)] p-3 shrink-0">
          <!-- 插件标题 -->
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-medium m-0 flex items-center gap-2">
              <el-icon><Box /></el-icon>
              {{ selectedPlugin.name }}
              <el-tag v-if="selectedPlugin._local" size="small" type="warning" effect="plain" class="!text-[12px]">本地未注册</el-tag>
            </h4>
            <div class="flex items-center gap-2">
              <el-button v-if="selectedPlugin._local" size="small" type="primary" plain :loading="registering" @click="registerToBackend">注册到后端</el-button>
              <el-switch v-model="selectedPlugin.active" active-text="启用" inactive-text="禁用" size="small" @change="(val: boolean) => togglePluginStatus(selectedPlugin, val)" />
            </div>
          </div>

          <!-- 描述文本 -->
          <p v-if="selectedPlugin.description" class="text-xs text-[var(--el-text-color-secondary)] m-0 mb-3 leading-relaxed">{{ selectedPlugin.description }}</p>

          <!-- 关联动作信息 -->
          <div v-if="selectedPlugin?.custom_action_id" class="mt-3 pt-3 border-t border-dashed border-[var(--el-border-color-lighter)]">
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-medium text-[var(--el-text-color-secondary)] flex items-center gap-1">
                <el-icon :size="14"><VideoPlay /></el-icon> 关联动作
              </label>
              <el-tag size="small" type="success" effect="plain">已绑定</el-tag>
            </div>

            <div class="p-2.5 rounded-lg bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-blue-200/80">
              <div class="flex items-start gap-2">
                <el-icon :size="18" class="text-blue-500 mt-0.5"><VideoPlay /></el-icon>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-blue-700 truncate">
                    {{ selectedPlugin.custom_action_name || selectedPlugin.custom_action_id }}
                  </div>
                  <div class="text-[11px] text-[var(--el-text-color-placeholder)] font-mono mt-0.5 truncate">
                    {{ selectedPlugin.custom_action_id }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="mt-3 pt-3 border-t border-dashed border-[var(--el-border-color-lighter)]">
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-medium text-[var(--el-text-color-secondary)] flex items-center gap-1">
                <el-icon :size="14"><VideoPlay /></el-icon> 关联动作
              </label>
              <el-tag size="small" type="warning" effect="plain">未设置</el-tag>
            </div>
            <p class="text-xs text-orange-600 bg-orange-50 p-2 rounded m-0">
              ⚠️ 此插件未关联自定义动作，将无法执行任何操作。请在编辑时选择要执行的动作。
            </p>
          </div>

          <!-- 配置参数区域 -->
          <div v-if="selectedPlugin.config_schema?.length" class="space-y-2 mt-2 pt-3 border-t border-[var(--el-border-color-lighter)]">
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium text-[var(--el-text-color-secondary)] flex items-center gap-1">
                <el-icon :size="12"><Setting /></el-icon> 配置参数
                <el-badge :value="selectedPlugin.config_schema.length" :max="99" />
              </label>
              <div class="flex items-center gap-1">
                <el-button size="small" text :icon="Plus" @click="addConfigParam">添加参数</el-button>
                <el-button size="small" text :disabled="!hasCustomConfig" @click="resetConfigToDefault"><el-icon><RefreshRight /></el-icon> 重置默认值</el-button>
              </div>
            </div>

            <!-- hook_type 和 priority -->
            <div class="flex gap-3 p-2 rounded bg-purple-50/50 border border-purple-100">
              <div class="flex-1">
                <label class="text-[9px] text-purple-600 font-mono mb-0.5 block">hook_type (钩子类型)</label>
                <el-select v-model="currentHookType" size="small" class="w-full">
                  <el-option label="before_action (前置)" value="before_action" />
                  <el-option label="after_action (后置)" value="after_action" />
                  <el-option label="on_success (成功时)" value="on_success" />
                  <el-option label="on_error (出错时)" value="on_error" />
                  <el-option label="on_timeout (超时时)" value="on_timeout" />
                </el-select>
              </div>
              <div class="w-28">
                <label class="text-[12px] text-purple-600 font-mono mb-0.5 block">priority (优先级)</label>
                <el-input-number v-model="currentPriority" :min="0" :max="100" size="small" controls-position="right" class="w-full" />
              </div>
            </div>

            <!-- 配置参数列表（grid 2列布局） -->
            <div class="grid grid-cols-2 gap-2">
              <div v-for="(config, idx) in selectedPlugin.config_schema" :key="idx" class="space-y-0.5 relative group">
                <div class="flex items-center gap-1">
                  <label class="text-[10px] text-[var(--el-text-color-placeholder)] font-mono flex-1 truncate">{{ config.key }}</label>
                  <button class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity" @click="removeConfigParam(idx)"><el-icon :size="14"><Close /></el-icon></button>
                </div>
                <div class="flex gap-1">
                  <el-input v-model="config.currentValue" :placeholder="String(config.default ?? '')" size="small" class="flex-1" />
                  <el-tag size="small" effect="plain" class="shrink-0 !text-[13px]">{{ config.type || 'string' }}</el-tag>
                </div>
              </div>
            </div>
          </div>

          <!-- 无配置参数提示 -->
          <div v-else class="mt-3 pt-3 border-t border-dashed border-[var(--el-border-color-lighter)]">
            <p class="text-xs text-[var(--el-text-color-placeholder)] m-0 text-center mb-2">此插件暂无配置参数，点击下方按钮添加</p>
            <div class="flex justify-center">
              <el-button size="small" text type="primary" :icon="Plus" @click="addConfigParam">添加第一个参数</el-button>
            </div>
          </div>
        </div>

        <!-- 未选中时空状态 -->
        <div v-else class="rounded-lg border border-dashed border-[var(--el-border-color-lighter)] p-6 text-center shrink-0">
          <el-icon :size="46" class="text-[var(--el-text-color-placeholder)]"><Box /></el-icon>
          <p class="text-sm text-[var(--el-text-color-secondary)] mt-2 m-0">从左侧选择或新建一个插件</p>
          <el-button size="small" type="primary" class="mt-2" :icon="Plus" @click="openCreateDialog">新建插件</el-button>
        </div>

        <!-- 触发历史 -->
        <div v-if="triggerHistory.length > 0" class="rounded-lg border border-[var(--el-border-color-lighter)] p-2 shrink-0 max-h-32 overflow-y-auto">
          <div class="text-xs font-medium text-[var(--el-text-color-secondary)] mb-1.5 flex items-center gap-1">
            <el-icon :size="16"><Clock /></el-icon> 触发历史
            <el-badge :value="Math.min(triggerHistory.length, 15)" :max="99" />
          </div>
          <div class="space-y-0.5">
            <div
              v-for="(event, idx) in visibleTriggerHistory"
              :key="idx"
              class="flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-base-100 transition-colors"
            >
              <!-- 状态圆点 -->
              <span :class="['w-2', 'h-2', 'rounded-full', 'shrink-0', event.success ? 'bg-green-500' : 'bg-red-500']" />
              <!-- 钩子类型标签 -->
              <el-tag size="small" type="warning" effect="plain" class="!text-[13px] !py-0 !px-1 shrink-0">{{ event.hook }}</el-tag>
              <!-- 插件名 -->
              <span class="text-purple-600 truncate flex-1 font-medium">{{ event.pluginName }}</span>
              <!-- 时间 -->
              <span class="text-[var(--el-text-color-placeholder)] shrink-0">{{ formatTime(event.time) }}</span>
              <!-- 成功/失败标签 -->
              <el-tag :type="event.success ? 'success' : 'danger'" size="small" effect="plain" class="!text-[13px] !py-0 !px-1 shrink-0">{{ event.success ? '成功' : '失败' }}</el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建/编辑插件对话框 -->
    <el-dialog v-model="showCreateDialog" :title="editingPlugin ? '编辑插件' : '新建插件'" width="560px" destroy-on-close append-to-body>
      <el-form label-position="top" size="small">
        <!-- 基本信息：插件名称 + Plugin ID -->
        <div class="grid grid-cols-2 gap-3">
          <el-form-item label="插件名称" required>
            <el-input v-model="createForm.name" placeholder="如: 截图增强、延迟控制" />
          </el-form-item>
          <el-form-item label="Plugin ID" required>
            <el-input v-model="createForm.plugin_id" placeholder="如: screenshot_enhancer" />
          </el-form-item>
        </div>

        <!-- 描述 -->
        <el-form-item label="描述">
          <el-input v-model="createForm.description" type="textarea" :rows="2" placeholder="描述这个插件的用途..." />
        </el-form-item>

        <!-- 版本 -->
        <el-form-item label="版本">
          <el-input v-model="createForm.version" placeholder="如: 1.0.0" />
        </el-form-item>

        <!-- 关联钩子 -->
        <el-form-item label="关联钩子">
          <el-checkbox-group v-model="createForm.hooks">
            <el-checkbox label="before_action" value="before_action">前置 (before_action)</el-checkbox>
            <el-checkbox label="after_action" value="after_action">后置 (after_action)</el-checkbox>
            <el-checkbox label="on_success" value="on_success">成功时 (on_success)</el-checkbox>
            <el-checkbox label="on_error" value="on_error">出错时 (on_error)</el-checkbox>
            <el-checkbox label="on_timeout" value="on_timeout">超时时 (on_timeout)</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <!-- 关联自定义动作（卡片列表） -->
        <el-form-item label="关联自定义动作" required>
          <!-- 工具栏：筛选 + 排序 + 新建 -->
          <div class="flex items-center gap-2 mb-3 flex-wrap">
            <el-select v-model="communityFilter" size="small" class="w-28" @change="onCommunityFilterChange">
              <el-option label="全部" value="all" />
              <el-option label="公开资源" value="public" />
              <el-option label="我的 Fork" value="my_forks" />
            </el-select>
            <el-select v-model="communitySortBy" size="small" class="w-32" @change="onCommunityFilterChange">
              <el-option label="最近更新" value="updated_at" />
              <el-option label="最多点赞" value="likes_count" />
              <el-option label="最多 Fork" value="forks_count" />
              <el-option label="名称" value="name" />
            </el-select>
            <el-button size="small" :icon="communitySortOrder === 'desc' ? SortDown : SortUp" @click="communitySortOrder = communitySortOrder === 'desc' ? 'asc' : 'desc'; onCommunityFilterChange()" />
            <div class="flex-1" />
            <el-button size="small" type="primary" :icon="Plus" @click="showCreateActionDialog = true">新建动作</el-button>
          </div>

          <!-- 卡片网格列表 -->
          <div v-loading="loadingCustomActions" class="space-y-2 min-h-[120px]">
            <!-- 卡片 -->
            <div
              v-for="action in availableCustomActions"
              :key="action.id"
              :class="[
                'group relative rounded-lg border p-3 transition-all cursor-default',
                createForm.custom_action_id === action.action_id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-[var(--el-border-color-lighter)] hover:border-[var(--el-border-color)] hover:shadow-sm bg-[var(--el-bg-color)]'
              ]"
            >
              <!-- 第一行：名称 + 标签行 -->
              <div class="flex items-start gap-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-sm font-medium truncate">{{ action.name }}</span>
                    <el-tag v-if="action.is_verified" size="small" type="success" effect="plain" class="!text-[10px] !py-0 !px-1 shrink-0">✓ 官方</el-tag>
                    <el-tag v-if="action.forked_from_id" size="small" type="warning" effect="plain" class="!text-[10px] !py-0 !px-1 shrink-0">Fork</el-tag>
                    <el-tag :size="small" :type="action.is_public ? 'primary' : 'info'" effect="plain" class="!text-[10px] !py-0 !px-1 shrink-0">
                      {{ action.is_public ? '公开' : '私有' }}
                    </el-tag>
                    <el-tag size="small" :type="action.action_type === 'composite' ? '' : 'info'" effect="plain" class="!text-[10px] !py-0 !px-1 shrink-0">
                      {{ action.action_type === 'composite' ? '复合' : '简单' }}
                    </el-tag>
                  </div>

                  <!-- 描述 -->
                  <p v-if="action.description" class="text-[11px] text-[var(--el-text-color-placeholder)] m-0 mt-1 line-clamp-2 leading-relaxed">{{ action.description }}</p>
                </div>
              </div>

              <!-- 第二行：统计 + 操作按钮 -->
              <div class="flex items-center gap-3 mt-2 pt-2 border-t border-dashed border-[var(--el-border-color-lighter)]">
                <!-- 左侧：互动统计 -->
                <div class="flex items-center gap-2 text-[11px]">
                  <button
                    class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-colors"
                    :class="action.is_liked_by_me ? 'text-red-500 bg-red-50' : 'text-[var(--el-text-color-secondary)] hover:bg-gray-100'"
                    :disabled="likingId === action.id"
                    @click="handleToggleLike(action)"
                  >
                    {{ action.is_liked_by_me ? '❤️' : '🤍' }} {{ action.likes_count ?? 0 }}
                  </button>
                  <span class="text-[var(--el-text-color-secondary)]">🔀 {{ action.forks_count ?? 0 }}</span>
                  <span class="text-[var(--el-text-color-placeholder)]">{{ action.steps_count || 0 }} 步</span>
                </div>

                <!-- 右侧：操作按钮组 -->
                <div class="flex items-center gap-1 ml-auto">
                  <el-button
                    v-if="action.is_public && !action.forked_from_id"
                    size="small"
                    text
                    class="!text-xs !px-1.5"
                    @click="openForkDialog(action)"
                  >Fork</el-button>
                  <el-button
                    size="small"
                    text
                    class="!text-xs !px-1.5"
                    :type="expandedActionId === action.id ? 'primary' : undefined"
                    @click="toggleActionDetail(action.id)"
                  >{{ expandedActionId === action.id ? '收起详情' : '详情' }}</el-button>
                  <el-button
                    size="small"
                    :type="createForm.custom_action_id === action.action_id ? 'primary' : undefined"
                    class="!text-xs !px-2"
                    @click="selectThisAction(action)"
                  >{{ createForm.custom_action_id === action.action_id ? '已选择' : '选择' }}</el-button>
                </div>
              </div>

              <!-- 展开的详情区域 -->
              <div v-if="expandedActionId === action.id" class="mt-2 pt-2 border-t border-[var(--el-border-color-lighter)]">
                <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <div><span class="text-[var(--el-text-color-placeholder)]">ID:</span> <span class="font-mono">{{ action.id }}</span></div>
                  <div><span class="text-[var(--el-text-color-placeholder)]">Action ID:</span> <span class="font-mono truncate block">{{ action.action_id }}</span></div>
                  <div><span class="text-[var(--el-text-color-placeholder)]">类型:</span> {{ action.action_type || 'composite' }}</div>
                  <div><span class="text-[var(--el-text-color-placeholder)]">步骤数:</span> {{ action.steps_count || 0 }}</div>
                  <div><span class="text-[var(--el-text-color-placeholder)]">举报数:</span> <span :class="action.reports_count > 0 ? 'text-orange-500' : ''">{{ action.reports_count ?? 0 }}</span></div>
                  <div><span class="text-[var(--el-text-color-placeholder)]">作者:</span> {{ action.author_name || '-' }}</div>
                  <div><span class="text-[var(--el-text-color-placeholder)]">创建时间:</span> {{ action.created_at?.split('T')[0] || '-' }}</div>
                  <div><span class="text-[var(--el-text-color-placeholder)]">更新时间:</span> {{ action.updated_at?.split('T')[0] || '-' }}</div>
                </div>
                <p v-if="action.forked_from_id" class="text-[10px] text-orange-400 mt-1.5 m-0 italic flex items-center gap-1">
                  🔀 Fork 自其他资源 (ID: {{ action.forked_from_id }})
                </p>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-if="!loadingCustomActions && availableCustomActions.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
              <el-icon :size="40" class="text-[var(--el-text-color-placeholder)]"><Box /></el-icon>
              <p class="text-sm text-[var(--el-text-color-secondary)] mt-2 m-0 mb-1">暂无自定义动作</p>
              <p class="text-xs text-[var(--el-text-color-placeholder)] m-0 mb-3">创建一个动作开始使用插件功能</p>
              <el-button size="small" type="primary" :icon="Plus" @click="showCreateActionDialog = true">+ 创建新动作</el-button>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="actionTotalCount > 0" class="flex justify-center mt-3 pt-2 border-t border-[var(--el-border-color-lighter)]">
            <el-pagination
              v-model:current-page="actionPageNum"
              :page-size="actionPageSize"
              :total="actionTotalCount"
              layout="prev, pager, next, total"
              small
              background
              @current-change="onActionPageChange"
            />
          </div>

          <!-- 已选提示 -->
          <div v-if="createForm.custom_action_id" class="mt-2 p-2 rounded-lg bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-blue-200/80">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-xs">
                <el-icon class="text-blue-500"><CircleCheck /></el-icon>
                <span class="text-blue-700 font-medium">已选择动作</span>
                <span class="font-mono text-blue-600">{{ availableCustomActions.find(a => a.action_id === createForm.custom_action_id)?.name || createForm.custom_action_id }}</span>
              </div>
              <el-button size="small" text type="danger" class="!text-xs" @click="createForm.custom_action_id = ''">清除</el-button>
            </div>
          </div>
        </el-form-item>

        <!-- 配置参数 Schema -->
        <el-form-item>
          <template #label>
            <div class="flex items-center justify-between w-full">
              <span>配置参数 Schema</span>
              <el-button size="small" text type="primary" :icon="Plus" @click="addCreateFormParam">+ 添加参数</el-button>
            </div>
          </template>
          <div v-if="createForm.config_schema.length === 0" class="text-center py-3 text-xs text-[var(--el-text-color-placeholder)] border border-dashed rounded">
            暂无配置参数，点击上方"+ 添加参数"添加
          </div>
          <div v-else class="space-y-2">
            <div v-for="(param, idx) in createForm.config_schema" :key="idx" class="flex gap-2 items-start p-2 rounded border border-[var(--el-border-color-lighter)]">
              <div class="flex-1 space-y-1">
                <div class="flex gap-2">
                  <el-input v-model="param.key" placeholder="参数名 (key)" size="small" class="flex-1" />
                  <el-select v-model="param.type" size="small" class="w-24">
                    <el-option label="string" value="string" />
                    <el-option label="number" value="number" />
                    <el-option label="boolean" value="boolean" />
                    <el-option label="array" value="array" />
                    <el-option label="object" value="object" />
                  </el-select>
                </div>
                <div class="flex gap-2">
                  <el-input v-model="param.default" placeholder="默认值" size="small" class="flex-1" />
                  <el-input v-model="param.description" placeholder="描述" size="small" class="flex-1" />
                </div>
              </div>
              <el-button size="small" text type="danger" :icon="Delete" @click="createForm.config_schema.splice(idx, 1)" />
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="submitCreatePlugin">{{ editingPlugin ? '保存修改' : '创建插件' }}</el-button>
      </template>
    </el-dialog>

    <!-- 钩子测试对话框 -->
    <el-dialog v-model="showHookTestDialog" title="测试插件钩子" width="500px" destroy-on-close append-to-body>
      <div v-if="selectedPlugin">
        <!-- 选择测试的钩子下拉框 -->
        <div class="mb-4">
          <label class="text-xs font-medium text-[var(--el-text-color-secondary)] mb-2 block">选择要测试的钩子</label>
          <el-select v-model="testHookName" placeholder="选择钩子" class="w-full">
            <el-option v-for="h in pluginHookList" :key="h.name" :label="`${h.name} (${h.type})`" :value="h.name" />
          </el-select>
        </div>

        <!-- 测试参数 JSON 输入框 -->
        <div v-if="testHookName" class="space-y-3">
          <div>
            <label class="text-xs font-medium text-[var(--el-text-color-secondary)] mb-2 block">测试参数 (JSON)</label>
            <el-input v-model="testParamsJson" type="textarea" :rows="4" placeholder='{"selector": "#test", "value": "example"}' />
          </div>

          <!-- 执行测试按钮 -->
          <el-button type="primary" :loading="testingHook" @click="executeHookTest"><el-icon><VideoPlay /></el-icon> 执行测试</el-button>

          <!-- 结果展示 -->
          <div v-if="hookTestResult" :class="['p-3', 'rounded-lg', 'border', hookTestResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50']">
            <div class="flex items-center gap-2 mb-2">
              <el-icon :class="hookTestResult.success ? 'text-green-500' : 'text-red-500'">
                <component :is="hookTestResult.success ? CircleCheck : CircleClose" />
              </el-icon>
              <span class="text-sm font-medium">{{ hookTestResult.success ? '执行成功' : '执行失败' }}</span>
              <span class="text-xs text-[var(--el-text-color-placeholder)] ml-auto">{{ hookTestResult.duration }}ms</span>
            </div>
            <pre class="text-xs overflow-auto max-h-32 m-0 p-2 rounded bg-white/60">{{ hookTestResult.output }}</pre>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showHookTestDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 快速创建自定义动作对话框 -->
    <el-dialog v-model="showCreateActionDialog" title="快速创建自定义动作" width="600px" destroy-on-close append-to-body>
      <el-form label-position="top" size="small">
        <el-form-item label="动作名称" required>
          <el-input v-model="newActionForm.name" placeholder="如: 操作前截图" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="newActionForm.description" type="textarea" :rows="2" />
        </el-form-item>

        <el-form-item label="动作类型">
          <el-radio-group v-model="newActionForm.action_type">
            <el-radio value="simple">简单动作</el-radio>
            <el-radio value="composite">复合动作（多步骤）</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 如果是复合动作，显示步骤编辑器 -->
        <div v-if="newActionForm.action_type === 'composite'" class="space-y-2">
          <div class="text-sm font-medium mb-2">步骤列表</div>
          <div v-for="(step, idx) in newActionForm.steps" :key="idx" class="p-2 rounded border flex items-center gap-2">
            <el-input v-model="step.action_id" placeholder="动作ID" size="small" class="flex-1" />
            <el-button size="small" text type="danger" @click="newActionForm.steps.splice(idx, 1)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <el-button size="small" @click="newActionForm.steps.push({ action_id: '', params: {} })">
            + 添加步骤
          </el-button>
        </div>

        <!-- 如果是简单动作，显示参数配置 -->
        <div v-else class="space-y-2">
          <el-form-item label="动作ID">
            <el-input v-model="newActionForm.simple_action_id" placeholder="如: screenshot" />
          </el-form-item>
          <el-form-item label="参数">
            <el-input v-model="newActionForm.simple_params_json" type="textarea" :rows="3" placeholder='{"path": "/tmp/screenshot.png"}' />
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="showCreateActionDialog = false">取消</el-button>
        <el-button type="primary" :loading="creatingAction" @click="handleCreateAction">创建动作</el-button>
      </template>
    </el-dialog>

    <!-- Fork 对话框 -->
    <el-dialog
      v-model="showForkDialog"
      title="Fork 资源"
      width="440px"
      destroy-on-close
      append-to-body
    >
      <div class="space-y-3">
        <div class="flex items-center gap-2 p-2.5 bg-[var(--el-fill-color-light)] rounded-lg">
          <el-icon :size="20" class="text-primary"><Box /></el-icon>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium m-0 truncate">{{ forkingAction?.name }}</p>
            <p class="text-xs text-[var(--el-text-color-placeholder)] m-0">{{ forkingAction?.description || '无描述' }}</p>
          </div>
        </div>

        <p class="text-xs text-[var(--el-text-color-secondary)] m-0">
          这将创建一个副本到您的工作区，Fork 后的资源默认为私有。
        </p>

        <el-form label-position="top" size="small">
          <el-form-item label="新名称（可选）">
            <el-input
              v-model="forkFormName"
              :placeholder="`默认: ${forkingAction?.name} (Fork)`"
              clearable
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="showForkDialog = false">取消</el-button>
        <el-button type="primary" :loading="forking" @click="handleConfirmFork">确认 Fork</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import {
  Refresh, Box, Setting, RefreshRight,
  Delete, Clock, FolderAdd, Connection, VideoPlay,
  Plus, Close, CircleCheck, CircleClose, InfoFilled,
  SortDown, SortUp
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import pluginsApi from '@/api/browser/plugins_api'
import customActionsApi from '@/api/browser/custom_actions_api'

// 类型定义
interface ConfigSchemaItem {
  key: string
  type: string
  default?: any
  description?: string
  currentValue?: any
}

interface PluginItem {
  _id?: string
  id?: number
  _local?: boolean
  name: string
  plugin_id: string
  description?: string
  version?: string
  active: boolean
  hooks: string[]
  config_schema: ConfigSchemaItem[]
  priority?: number
  hook_type?: string
  custom_action_id?: string       // 关联的自定义动作 ID (新增)
  custom_action_name?: string     // 关联的动作名称 (新增，用于显示)
}

interface TriggerEvent {
  pluginName: string
  hook: string
  time: number
  success: boolean
}

interface HookInfo {
  name: string
  type: string
}

interface TemplateDef {
  id: string
  name: string
  icon: string
  plugin_id: string
  description: string
  hooks: string[]
  default_custom_action_id?: string   // 新增：模板默认的关联动作 ID
  config_schema: Array<{ key: string; type: string; default?: any; description?: string }>
}

// 自定义动作项（用于选择器）
interface CustomActionItem {
  id: number
  action_id?: string
  name: string
  description?: string
  action_type?: string
  steps_count?: number
  created_at?: string
  updated_at?: string
  is_public?: boolean
  likes_count?: number
  reports_count?: number
  is_verified?: boolean
  forks_count?: number
  forked_from_id?: number | null
  is_liked_by_me?: boolean
  author_name?: string
}

// Props 和 Emits
const props = defineProps<{
  browserId: string
  browserRunning: boolean
}>()

const emit = defineEmits<{
  log: [message: string, type: 'info' | 'success' | 'warning' | 'error']
}>()

// 响应式状态
const loading = ref(false)
const registering = ref(false)
const loadingCustomActions = ref(false)
const plugins = ref<PluginItem[]>([])
const selectedPlugin = ref<PluginItem | null>(null)

const triggerHistory = ref<TriggerEvent[]>([])
const triggeringId = ref<string | null>(null)
const triggeringHook = ref<string | null>(null)

// 可用的自定义动作列表
const availableCustomActions = ref<CustomActionItem[]>([])

// 新建/编辑插件对话框状态
const showCreateDialog = ref(false)
const editingPlugin = ref<PluginItem | null>(null)
const createForm = reactive({
  name: '',
  plugin_id: '',
  description: '',
  version: '1.0.0',
  hooks: [] as string[],
  custom_action_id: '',           // 新增：关联的动作 ID
  config_schema: [] as Array<{ key: string; type: string; default?: any; description?: string }>
})

// 配置相关状态
const originalConfig = ref<Record<string, any>>({})
const currentHookType = ref('before_action')
const currentPriority = ref(50)

// 钩子测试对话框状态
const showHookTestDialog = ref(false)
const testHookName = ref('')
const testParamsJson = ref('{\n  \n}')
const testingHook = ref(false)
const hookTestResult = ref<{ success: boolean; output: string; duration: number } | null>(null)

// 快速创建自定义动作对话框状态
const showCreateActionDialog = ref(false)
const creatingAction = ref(false)
const newActionForm = reactive({
  name: '',
  description: '',
  action_type: 'composite',
  steps: [] as Array<{ action_id: string; params: Record<string, any> }>,
  simple_action_id: '',
  simple_params_json: '{}'
})

// ===== 社区互动状态 =====
const communityFilter = ref<'all' | 'public' | 'my_forks'>('all')
const communitySortBy = ref<'updated_at' | 'likes_count' | 'forks_count' | 'created_at' | 'name'>('updated_at')
const communitySortOrder = ref<'asc' | 'desc'>('desc')

// 分页状态
const actionPageNum = ref(1)
const actionPageSize = ref(8)
const actionTotalCount = ref(0)

// 详情面板
const expandedActionId = ref<number | null>(null)

// Fork 对话框
const showForkDialog = ref(false)
const forkingAction = ref<CustomActionItem | null>(null)
const forkFormName = ref('')
const forking = ref(false)

// 点赞 loading 状态
const likingId = ref<number | null>(null)

// 创建自定义动作
const handleCreateAction = async () => {
  if (!newActionForm.name.trim()) {
    ElMessage.warning('请输入动作名称')
    return
  }

  creatingAction.value = true
  try {
    let params: Record<string, any> = {
      name: newActionForm.name.trim(),
      description: newActionForm.description.trim(),
      is_public: false
    }

    if (newActionForm.action_type === 'composite') {
      params.steps = newActionForm.steps.filter(s => s.action_id)
      if (params.steps.length === 0) {
        ElMessage.warning('复合动作至少需要一个步骤')
        return
      }
    } else {
      // 简单动作转换为单步复合动作
      let parsedParams = {}
      try {
        parsedParams = JSON.parse(newActionForm.simple_params_json)
      } catch {
        ElMessage.warning('参数JSON格式无效')
        return
      }
      params.steps = [{
        action_id: newActionForm.simple_action_id,
        params: parsedParams
      }]
    }

    const res = await customActionsApi.createCustomAction(params)

    if (res.code === 0 && res.data) {
      ElMessage.success(`自定义动作 "${newActionForm.name}" 创建成功`)
      showCreateActionDialog.value = false

      // 自动选中刚创建的动作
      createForm.custom_action_id = res.data.action_id || `custom_${res.data.id}`

      // 刷新动作列表
      await fetchCustomActions()

      emit('log', `已创建并自动选中动作: ${newActionForm.name}`, 'success')

      // 重置表单
      newActionForm.name = ''
      newActionForm.description = ''
      newActionForm.action_type = 'composite'
      newActionForm.steps = []
      newActionForm.simple_action_id = ''
      newActionForm.simple_params_json = '{}'
    } else {
      ElMessage.error(`创建失败: ${res.msg}`)
      emit('log', `创建自定义动作失败: ${res.msg}`, 'error')
    }
  } catch (e: any) {
    ElMessage.error(`创建异常: ${e.message}`)
    emit('log', `创建自定义动作异常: ${e.message}`, 'error')
  } finally {
    creatingAction.value = false
  }
}

// 钩子类型标签映射
const HOOK_TYPE_LABELS: Record<string, string> = {
  before_action: '前置', after_action: '后置', on_success: '成功时',
  on_error: '出错时', on_timeout: '超时时',
  before_click: '点击前', before_input: '输入前',
  before_request: '请求前', after_response: '响应后',
  on_action_complete: '完成记录'
}

// 6个预定义模板（已添加 default_custom_action_id）
const pluginTemplates: TemplateDef[] = [
  {
    id: 'screenshot', name: '截图增强', icon: '📸', plugin_id: 'screenshot_enhancer',
    description: '操作前后自动截图对比',
    hooks: ['before_action', 'after_action'],
    default_custom_action_id: 'custom_screenshot_001',
    config_schema: [
      { key: 'format', type: 'string', default: 'png', description: '图片格式' },
      { key: 'quality', type: 'number', default: 90, description: '图片质量(1-100)' }
    ]
  },
  {
    id: 'delay', name: '延迟控制', icon: '⏱️', plugin_id: 'delay_controller',
    description: '在操作之间添加智能延迟',
    hooks: ['before_click', 'before_input'],
    default_custom_action_id: 'custom_random_wait',
    config_schema: [
      { key: 'base_delay_ms', type: 'number', default: 500, description: '基础延迟(ms)' },
      { key: 'random_range', type: 'number', default: 200, description: '随机波动范围(ms)' }
    ]
  },
  {
    id: 'verify', name: '结果验证', icon: '✅', plugin_id: 'result_verifier',
    description: '验证操作结果是否符合预期',
    hooks: ['after_action', 'on_error'],
    default_custom_action_id: 'custom_verify_result',
    config_schema: [
      { key: 'strict_mode', type: 'boolean', default: true, description: '严格模式' },
      { key: 'timeout_ms', type: 'number', default: 5000, description: '验证超时(ms)' }
    ]
  },
  {
    id: 'proxy', name: '代理管理', icon: '🌐', plugin_id: 'proxy_manager',
    description: '请求代理和响应拦截',
    hooks: ['before_request', 'after_response'],
    default_custom_action_id: 'custom_proxy_intercept',
    config_schema: [
      { key: 'proxy_url', type: 'string', default: '', description: '代理地址' },
      { key: 'intercept_headers', type: 'boolean', default: false, description: '拦截请求头' }
    ]
  },
  {
    id: 'log', name: '日志记录', icon: '📝', plugin_id: 'action_logger',
    description: '记录所有操作的详细日志',
    hooks: ['on_action_complete'],
    default_custom_action_id: 'custom_log_action',
    config_schema: [
      { key: 'log_level', type: 'string', default: 'info', description: '日志级别' },
      { key: 'include_screenshot', type: 'boolean', default: false, description: '是否包含截图' }
    ]
  },
  {
    id: 'retry', name: '错误重试', icon: '🔄', plugin_id: 'auto_retry',
    description: '操作失败时自动重试',
    hooks: ['on_error'],
    default_custom_action_id: 'custom_retry_action',
    config_schema: [
      { key: 'max_retries', type: 'number', default: 3, description: '最大重试次数' },
      { key: 'backoff_ms', type: 'number', default: 1000, description: '退避间隔(ms)' }
    ]
  }
]

// 获取可用自定义动作列表
const fetchCustomActions = async () => {
  loadingCustomActions.value = true
  try {
    emit('log', '正在加载自定义动作列表...', 'info')
    const res = await customActionsApi.listCustomActions({
      page: actionPageNum.value,
      per_page: actionPageSize.value,
      filter_type: communityFilter.value,
      sort_by: communitySortBy.value,
      sort_order: communitySortOrder.value
    })

    if (res.code === 0 && res.data) {
      // 新版分页响应：data 是 { items, total, pages, ... } 对象
      const paginatedData = res.data as any
      const items = paginatedData.items || paginatedData || []
      availableCustomActions.value = items.map((action: any) => ({
        id: action.id,
        action_id: action.action_id || `custom_${action.id}`,
        name: action.name || '未命名动作',
        description: action.description || '',
        action_type: action.action_type || 'composite',
        steps_count: action.steps?.length || 0,
        created_at: action.created_at,
        updated_at: action.updated_at,
        is_public: action.is_public ?? false,
        likes_count: action.likes_count ?? 0,
        reports_count: action.reports_count ?? 0,
        is_verified: action.is_verified ?? false,
        forks_count: action.forks_count ?? 0,
        forked_from_id: action.forked_from_id ?? null,
        is_liked_by_me: action.is_liked_by_me ?? false,
        author_name: action.author_name ?? ''
      }))

      // 后端返回真实分页元数据
      actionTotalCount.value = paginatedData.total ?? 0

      emit('log', `已加载 ${availableCustomActions.value.length} 个自定义动作`, 'success')
    } else {
      emit('log', `获取自定义动作列表失败: ${res.msg}`, 'warning')
    }
  } catch (e: any) {
    emit('log', `获取自定义动作列表异常: ${e.message}`, 'error')
  } finally {
    loadingCustomActions.value = false
  }
}

// 筛选/排序变化时重置到第一页
const onCommunityFilterChange = () => {
  actionPageNum.value = 1
  expandedActionId.value = null
  fetchCustomActions()
}

// 分页变化
const onActionPageChange = (page: number) => {
  actionPageNum.value = page
  expandedActionId.value = null
  fetchCustomActions()
}

// 切换详情展开
const toggleActionDetail = (id: number) => {
  expandedActionId.value = expandedActionId.value === id ? null : id
}

// 选择此动作作为插件关联
const selectThisAction = (action: CustomActionItem) => {
  createForm.custom_action_id = action.action_id || ''
}

// ===== 点赞/取消点赞 =====
const handleToggleLike = async (action: CustomActionItem) => {
  if (likingId.value === action.id) return
  likingId.value = action.id
  try {
    const res = action.is_liked_by_me
      ? await customActionsApi.unlikeAction(action.id)
      : await customActionsApi.likeAction(action.id)
    if (res.code === 0 && res.data) {
      action.is_liked_by_me = res.data.liked
      action.likes_count = res.data.likes_count
    }
  } catch (e: any) {
    ElMessage.error(`操作失败: ${e.message}`)
  } finally {
    likingId.value = null
  }
}

// ===== Fork 功能 =====
const openForkDialog = (action: CustomActionItem) => {
  if (!action.is_public) {
    ElMessage.warning('只能 Fork 公开的资源')
    return
  }
  forkingAction.value = action
  forkFormName.value = ''
  showForkDialog.value = true
}

const handleConfirmFork = async () => {
  if (!forkingAction.value) return
  forking.value = true
  try {
    const res = await customActionsApi.forkAction({
      id: forkingAction.value.id,
      new_name: forkFormName.value.trim() || undefined
    })
    if (res.code === 0 && res.data) {
      ElMessage.success(`Fork 成功: ${res.data.name}`)
      showForkDialog.value = false
      forkingAction.value = null
      forkFormName.value = ''
      await fetchCustomActions()
    } else {
      ElMessage.error(`Fork 失败: ${res.msg}`)
    }
  } catch (e: any) {
    ElMessage.error(`Fork 异常: ${e.message}`)
  } finally {
    forking.value = false
  }
}

// 辅助函数
const pluginKey = (p: PluginItem): string => p._id || String(p.id)

const isTriggering = (plugin: PluginItem): boolean => triggeringId.value === pluginKey(plugin)

const cardClass = (plugin: PluginItem) => {
  const isSelected = selectedPlugin.value && pluginKey(selectedPlugin.value) === pluginKey(plugin)
  if (isSelected) return 'border-primary bg-primary/5 shadow-sm'
  if (plugin.active) return 'border-green-300 bg-green-50/50'
  return 'border-base-200 hover:border-base-300 hover:shadow-sm'
}

// 构建钩子列表
const buildHookList = (plugin: PluginItem): HookInfo[] => {
  if (plugin.hooks?.length) {
    return plugin.hooks.map((h: string) => ({
      name: h,
      type: HOOK_TYPE_LABELS[h] || '通用'
    }))
  }

  const hooks: HookInfo[] = []
  const name = (plugin.name || '').toLowerCase()
  const pid = (plugin.plugin_id || '').toLowerCase()

  const rules: Array<{ keywords: string[]; hooks: HookInfo[] }> = [
    { keywords: ['screenshot'], hooks: [{ name: 'before_action', type: '前置' }, { name: 'after_action', type: '后置' }] },
    { keywords: ['delay', '延迟'], hooks: [{ name: 'before_click', type: '点击前' }, { name: 'before_input', type: '输入前' }] },
    { keywords: ['verify', '验证'], hooks: [{ name: 'after_action', type: '验证' }, { name: 'on_error', type: '错误处理' }] },
    { keywords: ['proxy', '代理'], hooks: [{ name: 'before_request', type: '请求前' }, { name: 'after_response', type: '响应后' }] },
    { keywords: ['log', '日志'], hooks: [{ name: 'on_action_complete', type: '完成记录' }] },
    { keywords: ['retry', '重试'], hooks: [{ name: 'on_error', type: '错误重试' }] }
  ]

  for (const rule of rules) {
    if (rule.keywords.some(k => name.includes(k) || pid.includes(k))) {
      hooks.push(...rule.hooks)
      break
    }
  }

  if (!hooks.length && plugin.config_schema?.length) {
    hooks.push({ name: 'before_action', type: '通用' })
  }

  return hooks
}

// 计算属性
const pluginHookList = computed((): HookInfo[] => {
  if (!selectedPlugin.value) return []
  return buildHookList(selectedPlugin.value)
})

const pluginHookListMap = computed((): Record<string, HookInfo[]> => {
  const map: Record<string, HookInfo[]> = {}
  for (const p of plugins.value) {
    map[pluginKey(p)] = buildHookList(p)
  }
  return map
})

const hasCustomConfig = computed(() => {
  if (!selectedPlugin.value?.config_schema) return false
  return selectedPlugin.value.config_schema.some(c => c.currentValue !== c.default && c.currentValue !== undefined && c.currentValue !== '')
})

const hasConfigChanges = computed(() => {
  if (!selectedPlugin.value?.config_schema) return false
  return selectedPlugin.value.config_schema.some(c => JSON.stringify(c.currentValue) !== JSON.stringify(originalConfig.value[c.key]))
})

const visibleTriggerHistory = computed(() => triggerHistory.value.slice(-15).reverse())

// 插件选择
const selectPlugin = (plugin: PluginItem) => {
  selectedPlugin.value = plugin
  currentHookType.value = plugin.hook_type || (plugin.hooks?.[0]) || 'before_action'
  currentPriority.value = plugin.priority ?? 50
  originalConfig.value = {}
  if (plugin.config_schema) {
    plugin.config_schema.forEach((c: ConfigSchemaItem) => {
      originalConfig.value[c.key] = c.currentValue ?? c.default
    })
  }
  emitLog('info', `选中插件: ${plugin.name}`)
}

// 新建/编辑插件对话框
const openCreateDialog = () => {
  editingPlugin.value = null
  resetCreateForm()
  showCreateDialog.value = true
}

const resetCreateForm = () => {
  createForm.name = ''
  createForm.plugin_id = ''
  createForm.description = ''
  createForm.version = '1.0.0'
  createForm.hooks = ['before_action']
  createForm.custom_action_id = ''     // 新增：重置
  createForm.config_schema = []
}

const addCreateFormParam = () => {
  createForm.config_schema.push({
    key: `param_${createForm.config_schema.length + 1}`,
    type: 'string',
    default: '',
    description: ''
  })
}

const submitCreatePlugin = () => {
  if (!createForm.name.trim()) {
    ElMessage.warning('请输入插件名称')
    return
  }
  if (!createForm.plugin_id.trim()) {
    ElMessage.warning('请输入 Plugin ID')
    return
  }
  if (!createForm.custom_action_id.trim()) {    // 新增验证
    ElMessage.warning('请选择关联的自定义动作')
    return
  }

  const newPlugin: PluginItem = {
    _local: true,
    _id: `local_${Date.now()}`,
    name: createForm.name.trim(),
    plugin_id: createForm.plugin_id.trim(),
    description: createForm.description.trim(),
    version: createForm.version || '1.0.0',
    active: true,
    hooks: [...createForm.hooks],
    custom_action_id: createForm.custom_action_id,    // 新增
    custom_action_name: availableCustomActions.value.find(    // 新增：查找选中的动作名称
      a => a.action_id === createForm.custom_action_id
    )?.name || createForm.custom_action_id,
    config_schema: createForm.config_schema.map(c => ({
      key: c.key,
      type: c.type || 'string',
      default: c.default ?? '',
      description: c.description || '',
      currentValue: c.default ?? ''
    })),
    priority: 50,
    hook_type: createForm.hooks[0] || 'before_action'
  }

  if (editingPlugin.value) {
    const editKey = pluginKey(editingPlugin.value)
    const idx = plugins.value.findIndex(p => pluginKey(p) === editKey)
    if (idx >= 0) {
      plugins.value[idx] = { ...newPlugin, id: editingPlugin.value.id, _local: editingPlugin.value._local, _id: editingPlugin.value._id }
      if (selectedPlugin.value && pluginKey(selectedPlugin.value) === editKey) {
        selectPlugin(plugins.value[idx])
      }
    }
    ElMessage.success(`插件 "${newPlugin.name}" 已更新`)
    emitLog('success', `更新插件: ${newPlugin.name}`)
  } else {
    plugins.value.push(newPlugin)
    selectPlugin(newPlugin)
    ElMessage.success(`插件 "${newPlugin.name}" 已创建`)
    emitLog('success', `创建新插件: ${newPlugin.name} (${newPlugin.plugin_id})`)
    emit('log', `[Plugin] 新建插件: ${newPlugin.name}`, 'success')
  }

  showCreateDialog.value = false
  editingPlugin.value = null
}

// 从模板创建
const createFromTemplate = (tpl: TemplateDef) => {
  const newPlugin: PluginItem = {
    _local: true,
    _id: `local_${Date.now()}`,
    name: tpl.name,
    plugin_id: tpl.plugin_id,
    description: tpl.description,
    version: '1.0.0',
    active: true,
    hooks: [...tpl.hooks],
    custom_action_id: tpl.default_custom_action_id || '',    // 使用模板默认值
    custom_action_name: availableCustomActions.value.find(    // 查找动作名称
      a => (a.action_id || a.id) === (tpl.default_custom_action_id || '')
    )?.name || tpl.default_custom_action_id || '未指定动作',
    config_schema: tpl.config_schema.map(c => ({
      key: c.key,
      type: c.type,
      default: c.default ?? '',
      description: c.description || '',
      currentValue: c.default ?? ''
    })),
    priority: 50,
    hook_type: tpl.hooks[0] || 'before_action'
  }
  plugins.value.push(newPlugin)
  selectPlugin(newPlugin)
  ElMessage.success(`从模板创建插件: ${tpl.name}`)
  emitLog('success', `从模板创建插件: ${tpl.name}`)
  emit('log', `[Plugin] 从模板创建: ${tpl.name}`, 'success')
}

// 删除本地插件
const removeLocalPlugin = (plugin: PluginItem) => {
  const targetKey = pluginKey(plugin)
  plugins.value = plugins.value.filter(p => pluginKey(p) !== targetKey)
  if (selectedPlugin.value && pluginKey(selectedPlugin.value) === targetKey) {
    selectedPlugin.value = null
  }
  emitLog('warning', `删除本地插件: ${plugin.name}`)
  emit('log', `[Plugin] 删除: ${plugin.name}`, 'warning')
}

// 注册到后端
const registerToBackend = async () => {
  if (!selectedPlugin.value?._local) return
  registering.value = true
  try {
    const res = await pluginsApi.createPlugin({
      name: selectedPlugin.value.name,
      plugin_id: selectedPlugin.value.plugin_id,
      description: selectedPlugin.value.description,
      version: selectedPlugin.value.version,
      hooks: selectedPlugin.value.hooks,
      custom_action_id: selectedPlugin.value.custom_action_id,    // 新增
      priority: selectedPlugin.value.priority
    })

    if (res.code === 0 || res.data?.id) {
      selectedPlugin.value._local = false
      selectedPlugin.value.id = res.data?.id || res.data
      ElMessage.success(`插件 "${selectedPlugin.value.name}" 已注册到后端`)
      emitLog('success', `插件已注册到后端: ${selectedPlugin.value.name}`)
      emit('log', `[Plugin] 已注册: ${selectedPlugin.value.name}`, 'success')
    } else {
      ElMessage.error(`注册失败: ${res.msg}`)
      emitLog('error', `注册失败: ${res.msg}`)
    }
  } catch (e: any) {
    ElMessage.error(`注册异常: ${e.message}`)
    emitLog('error', `注册异常: ${e.message}`)
  } finally {
    registering.value = false
  }
}

// 配置参数管理
const addConfigParam = () => {
  if (!selectedPlugin.value) return
  if (!selectedPlugin.value.config_schema) {
    selectedPlugin.value.config_schema = []
  }
  selectedPlugin.value.config_schema.push({
    key: `param_${selectedPlugin.value.config_schema.length + 1}`,
    type: 'string',
    default: '',
    description: '',
    currentValue: ''
  })
}

const removeConfigParam = (idx: number) => {
  selectedPlugin.value?.config_schema?.splice(idx, 1)
}

// 切换插件状态
const togglePluginStatus = async (plugin: PluginItem, val: boolean) => {
  try {
    const res = await pluginsApi.updatePlugin({ id: plugin.id!, is_enabled: val })
    if (res.code === 0) {
      emitLog(val ? 'success' : 'warning', `插件 "${plugin.name}" 已${val ? '启用' : '禁用'}`)
      triggerHistory.value.push({ pluginName: plugin.name, hook: '状态变更', time: Date.now(), success: true })
    } else {
      plugin.active = !val
      emitLog('error', `状态切换失败: ${res.msg}`)
    }
  } catch (e: any) {
    plugin.active = !val
    emitLog('error', `异常: ${e.message}`)
  }
}

// 重置配置为默认值
const resetConfigToDefault = () => {
  if (!selectedPlugin.value?.config_schema) return
  selectedPlugin.value.config_schema.forEach(c => { c.currentValue = c.default ?? '' })
  emitLog('info', '配置参数已重置为默认值')
  emit('log', '[Plugin] 配置重置', 'info')
}

// 保存插件配置
const savePluginConfig = async () => {
  if (!selectedPlugin.value) return
  try {
    const configData: Record<string, any> = {}
    selectedPlugin.value.config_schema.forEach(c => { configData[c.key] = c.currentValue })

    const res = await pluginsApi.updatePlugin({
      id: selectedPlugin.value.id!,
      plugin_id: selectedPlugin.value.plugin_id,
      priority: currentPriority.value
    })

    if (res.code === 0) {
      originalConfig.value = { ...configData }
      ElMessage.success(`插件 "${selectedPlugin.value.name}" 的配置已保存`)
      emitLog('success', `插件配置已保存: ${selectedPlugin.value.name}`)
      emit('log', '[Plugin] 配置已保存', 'success')
    } else {
      emitLog('error', `保存配置失败: ${res.msg}`)
      ElMessage.error(`保存失败: ${res.msg}`)
    }
  } catch (e: any) {
    emitLog('error', `保存配置异常: ${e.message}`)
    ElMessage.error('保存配置失败')
  }
}

// 钩子测试对话框
const openHookTestDialog = () => {
  testHookName.value = ''
  testParamsJson.value = '{\n  \n}'
  hookTestResult.value = null
  showHookTestDialog.value = true
}

const executeHookTest = async () => {
  if (!selectedPlugin.value || !testHookName.value) return

  testingHook.value = true
  hookTestResult.value = null
  const startTime = Date.now()

  try {
    let params = {}
    if (testParamsJson.value.trim()) {
      try { params = JSON.parse(testParamsJson.value) } catch { ElMessage.warning('JSON 格式不正确，将使用空参数') }
    }

    emitLog('info', `测试钩子: ${testHookName.value}`)

    triggeringId.value = pluginKey(selectedPlugin.value)
    triggeringHook.value = testHookName.value

    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500))

    const duration = Date.now() - startTime
    const success = Math.random() > 0.2

    hookTestResult.value = {
      success,
      output: success
        ? JSON.stringify({ hook: testHookName.value, plugin: selectedPlugin.value.name, params, result: 'Hook executed successfully', timestamp: new Date().toISOString() }, null, 2)
        : `Error: Hook execution failed - Simulated error for testing`,
      duration
    }

    triggerHistory.value.push({ pluginName: selectedPlugin.value.name, hook: testHookName.value, time: Date.now(), success })

    emitLog(success ? 'success' : 'error', success ? `钩子 ${testHookName.value} 执行成功` : `钩子 ${testHookName.value} 执行失败`)
  } catch (e: any) {
    hookTestResult.value = { success: false, output: `Exception: ${e.message}`, duration: Date.now() - startTime }
    emitLog('error', `钩子测试异常: ${e.message}`)
  } finally {
    testingHook.value = false
    setTimeout(() => { triggeringId.value = null; triggeringHook.value = null }, 800)
  }
}

// 刷新插件列表
const refreshPlugins = async () => {
  loading.value = true
  try {
    emit('log', '刷新插件列表...', 'info')
    const res = await pluginsApi.listPlugins()

    if (res.code === 0 && res.data) {
      const remotePlugins: PluginItem[] = res.data.map((p: any) => ({
        ...p,
        config_schema: (p.config_schema || []).map((c: any) => ({ ...c, currentValue: c.default ?? '' }))
      }))
      const localPlugins = plugins.value.filter(p => p._local)
      plugins.value = [...remotePlugins, ...localPlugins]
      emitLog('success', `已加载 ${remotePlugins.length} 个远程插件, ${localPlugins.length} 个本地插件`)
    } else {
      emitLog('error', `刷新失败: ${res.msg}`)
    }
  } catch (e: any) {
    emitLog('error', `刷新异常: ${e.message}`)
  } finally {
    loading.value = false
  }
}

// 模拟触发
const simulateTrigger = (
  pluginId: string,
  hookName: string,
  success: boolean,
  message?: string,
  configInfo?: string
) => {
  const plugin = plugins.value.find(p => (p.plugin_id || String(p.id)) === pluginId)
  if (!plugin) return

  triggeringId.value = pluginId
  triggeringHook.value = hookName

  const logMsg = message || `[${hookName}] ${success ? '触发成功' : '触发失败'}`
  const fullMsg = configInfo ? `${logMsg} | Config: ${configInfo}` : logMsg

  emitLog(success ? 'success' : 'error', fullMsg)

  triggerHistory.value.push({ pluginName: plugin.name, hook: hookName, time: Date.now(), success })

  setTimeout(() => { triggeringId.value = null; triggeringHook.value = null }, 800)
}

// 日志输出
const emitLog = (level: 'info' | 'success' | 'warning' | 'error', message: string) => {
  const emitType: 'info' | 'success' | 'warning' | 'error' = level === 'warning' ? 'warning' : level === 'error' ? 'error' : level === 'success' ? 'success' : 'info'
  emit('log', `[Plugin] ${message}`, emitType)
}

// 格式化时间
const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false })

// 监听钩子测试对话框打开
watch(showHookTestDialog, (val) => {
  if (val) {
    testHookName.value = ''
    testParamsJson.value = '{\n  \n}'
    hookTestResult.value = null
  }
})

// 组件挂载时加载数据
onMounted(() => {
  refreshPlugins()
  fetchCustomActions()    // 新增：加载自定义动作列表
})

// 暴露方法
const loadData = () => refreshPlugins()

defineExpose({ loadData, simulateTrigger })
</script>

<style scoped>
.debug-plugin-panel {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
