<script setup lang="ts">
import { ElText } from 'element-plus'

interface DisclaimerSection {
  title: string
  paragraphs: string[]
  bullets?: string[]
}

const sections: DisclaimerSection[] = [
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
      请仔细阅读本免责声明。使用 serena（https://serena.dynv6.net） 提供的服务，即表示您同意本免责声明的全部内容。
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
    </section>

    <el-text class="disclaimer-view__footer block text-text-secondary mt-12">
      serena · 最后更新：2026-10-02
    </el-text>
  </div>
</template>
