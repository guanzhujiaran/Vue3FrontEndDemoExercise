<script setup lang="ts">
import { ElLink, ElText } from 'element-plus'
import { onSpaLinkClick } from '@/utils/PageOpen/spaLink'
import router from '@/router'

const goTo = (path: string) => router.push(path)

interface DisclaimerLink {
  text: string
  to: string
}

interface DisclaimerSection {
  title: string
  paragraphs: string[]
  bullets?: string[]
  links?: DisclaimerLink[]
}

const sections: DisclaimerSection[] = [
  {
    // 非官方第三方服务声明：Google 安全浏览要求含第一方品牌的页面明确标示运营方与双方关系，
    // 并给出「更多信息」链接，否则会被归入社交工程（欺骗性网页）。
    title: '本站与哔哩哔哩的关系（非官方第三方服务声明）',
    paragraphs: [
      '本站（BiliExplosion，https://serena.dynv6.net）由个人独立开发并运营，是独立于哔哩哔哩（bilibili）的非官方第三方数据整理工具，与哔哩哔哩及其关联公司不存在任何隶属、授权、合作或背书关系。',
      '页面中的「B站」「哔哩哔哩」「bilibili」「官方抽奖」等字样，仅用于说明所整理数据的来源与类别，不表示本站由哔哩哔哩运营或获得其授权。本站展示的抽奖信息来自公开页面与公开接口，请以 B 站原页面为准。',
      '本站登录使用本站账号体系（Casdoor / Gitee 第三方授权），不是 B 站账号登录。本站不会要求您提供 B 站账号、密码、短信验证码、SESSDATA、bili_jct 或任何 B 站 Cookie；如遇以本站名义索取上述信息的页面，请勿填写并联系我们。',
      '本站不提供、也不引导下载或安装任何客户端、插件、浏览器扩展及其他软件；页面中的站外链接均指向 B 站公开页面。'
    ],
    links: [
      { text: '查看隐私政策与第三方服务清单', to: '/app/privacy-policy' },
      { text: '返回首页', to: '/' }
    ]
  },
  {
    title: '1. 信息准确性',
    paragraphs: [
      '我们尽力确保本网站所提供信息的准确性和及时性，但不保证其完整性、准确性或适用性。本网站的内容可能包含技术性错误或印刷错误。',
      '本网站上的信息仅供参考，不应被视为专业建议。在依赖本网站信息做出任何决定之前，您应当自行核实相关信息并寻求专业意见。'
    ]
  },
  {
    title: '2. 外部链接',
    paragraphs: [
      '本网站可能包含指向第三方网站的链接。这些链接仅为方便用户而提供，我们对这些外部网站的内容、隐私政策或做法不承担任何责任。',
      '链接至第三方网站不代表我们对该网站或其内容的认可。您访问任何外部网站的风险由您自行承担。'
    ]
  },
  {
    title: '3. 技术错误',
    paragraphs: [
      '我们不保证本网站将持续可用、不受干扰或无错误。网站可能会因维护、升级或其他原因暂时无法访问。',
      '对于因技术故障、系统错误、病毒或其他有害组件造成的任何损失，我们不承担责任。'
    ]
  },
  {
    title: '4. 责任限制',
    paragraphs: [
      '在法律允许的最大范围内，serena 及其董事、员工、合作伙伴不对以下情况承担任何责任：'
    ],
    bullets: [
      '因使用或无法使用本网站而产生的任何直接、间接、附带、特殊或后果性损害',
      '任何利润损失、业务中断、数据丢失或其他经济损失',
      '因依赖本网站信息而做出的任何决定或行动',
      '任何第三方的行为或内容'
    ]
  },
  {
    title: '5. 变更权利',
    paragraphs: [
      '我们保留随时修改、更新或删除本网站内容的权利，恕不另行通知。我们也可能随时修改本免责声明。',
      '继续使用本网站即表示您接受任何修改后的条款。'
    ]
  },
  {
    title: '6. 联系我们',
    paragraphs: [
      '如果您对本免责声明有任何疑问，请通过以下方式联系我们：',
      '邮箱：guanzhujiaran2022@163.com',
      '网站：https://serena.dynv6.net'
    ]
  }
]
</script>

<template>
  <div class="disclaimer-view max-w-3xl mx-auto px-6 py-10">
    <el-text tag="h1" size="large" class="disclaimer-view__title block text-3xl font-bold text-text-primary mb-2">
      免责声明
    </el-text>
    <el-text class="disclaimer-view__updated block text-text-secondary mb-6">最后更新：2026-10-02</el-text>
    <el-text class="disclaimer-view__lead block text-text-regular leading-relaxed mb-8">
      请仔细阅读本免责声明。serena（https://serena.dynv6.net）是独立于哔哩哔哩的非官方第三方数据工具；使用本站提供的服务，即表示您同意本免责声明的全部内容。
    </el-text>

    <section
      v-for="section in sections"
      :key="section.title"
      class="disclaimer-view__section mb-8"
    >
      <el-text tag="h2" size="large" class="disclaimer-view__section-title block text-xl font-bold text-text-primary mb-3">
        {{ section.title }}
      </el-text>
      <el-text
        v-for="(paragraph, index) in section.paragraphs"
        :key="index"
        class="disclaimer-view__paragraph block text-text-regular leading-relaxed mb-2"
      >
        {{ paragraph }}
      </el-text>
      <ul v-if="section.bullets" class="disclaimer-view__bullets list-disc pl-6">
        <li v-for="bullet in section.bullets" :key="bullet" class="disclaimer-view__bullet text-text-regular leading-relaxed">
          {{ bullet }}
        </li>
      </ul>
      <div v-if="section.links" class="disclaimer-view__links mt-3 flex flex-wrap gap-x-6 gap-y-2">
        <el-link
          v-for="link in section.links"
          :key="link.to"
          class="disclaimer-view__link text-sm! no-underline hover:underline"
          :href="link.to"
          target="_self"
          @click="onSpaLinkClick($event, () => goTo(link.to))"
        >
          {{ link.text }}
        </el-link>
      </div>
    </section>

    <el-text class="disclaimer-view__footer block text-text-secondary mt-12">
      serena · 最后更新：2026-10-02
    </el-text>
  </div>
</template>
