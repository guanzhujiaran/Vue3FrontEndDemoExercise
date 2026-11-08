/**
 * 动作图标「全覆盖」纯逻辑单测
 *
 * 规格见仓库根 `docs/frontend_requirements/RPA动作图标全覆盖.md`
 * 覆盖：稳定自动分配、手动选择优先、越界编号回落自动分配、URL 一致性
 */
import { describe, expect, it } from 'vitest'
import {
  AUTO_ICON_SERIES,
  autoAssignActionIcon,
  hasActionIcon,
  resolveActionIconUrl,
  resolveDisplayActionIconUrl,
} from '@/utils/rpa/actionIcon'

describe('自动分配图标', () => {
  it('分配结果落在真实存在的 s_33 编号范围内', () => {
    const assigned = autoAssignActionIcon('ca_104682832')
    expect(assigned).not.toBeNull()
    expect(assigned?.series).toBe(AUTO_ICON_SERIES)
    expect(assigned?.id).toBeGreaterThanOrEqual(1)
    expect(assigned?.id).toBeLessThanOrEqual(121)
    expect(hasActionIcon(assigned?.series, assigned?.id)).toBe(true)
  })

  it('同一 seed 稳定、不同 seed 大概率不同', () => {
    const first = autoAssignActionIcon('ca_aaa')
    const again = autoAssignActionIcon('ca_aaa')
    expect(first).toEqual(again)

    const picked = new Set(
      Array.from({ length: 20 }, (_, i) => autoAssignActionIcon(`ca_${i}`)?.id),
    )
    expect(picked.size).toBeGreaterThan(1)
  })

  it('seed 为空时仍给出确定结果', () => {
    expect(autoAssignActionIcon()).toEqual(autoAssignActionIcon(null))
  })
})

describe('展示层图标解析', () => {
  it('手动选择的真实图标优先，不被自动分配覆盖', () => {
    const assigned = autoAssignActionIcon('ca_manual')
    expect(assigned).not.toBeNull()
    const url = resolveActionIconUrl(assigned?.series, assigned?.id)
    expect(url).not.toBeNull()
    expect(resolveDisplayActionIconUrl(assigned?.series, assigned?.id, 'ca_manual')).toBe(url)
  })

  it('未配置图标（0/0）时自动分配，不再返回 null', () => {
    const autoUrl = resolveDisplayActionIconUrl(0, 0, 'ca_104682832')
    expect(autoUrl).not.toBeNull()
    expect(autoUrl).toBe(resolveDisplayActionIconUrl(0, 0, 'ca_104682832'))
  })

  it('编号越界（图库无对应资源）时同样自动分配', () => {
    expect(resolveActionIconUrl(AUTO_ICON_SERIES, 9999)).toBeNull()
    const autoUrl = resolveDisplayActionIconUrl(AUTO_ICON_SERIES, 9999, 'ca_legacy')
    expect(autoUrl).not.toBeNull()
    expect(autoUrl).toBe(resolveDisplayActionIconUrl(0, 0, 'ca_legacy'))
  })

  it('自动分配的 URL 与 autoAssignActionIcon 的编号一致', () => {
    const seed = 'ca_consistent'
    const assigned = autoAssignActionIcon(seed)
    expect(assigned).not.toBeNull()
    expect(resolveDisplayActionIconUrl(0, 0, seed)).toBe(
      resolveActionIconUrl(assigned?.series, assigned?.id),
    )
  })
})
