<script setup lang="ts">
import { ElText } from 'element-plus'

interface PolicySection {
  title: string
  paragraphs: string[]
  bullets?: string[]
}

const sections: PolicySection[] = [
  {
    title: '我们如何收集和使用您的个人信息',
    paragraphs: [
      '个人信息是指以电子或者其他方式记录的，能够单独或者与其他信息结合，识别特定自然人身份或者反映特定自然人活动情况的各种信息。我们根据《中华人民共和国网络安全法》和《信息安全技术个人信息安全规范》（GB/T 35273-2017）以及其它相关法律法规的要求，并严格遵循正当、合法、必要的原则，在您使用我们提供的服务或产品过程中，收集和使用您的个人信息包括但不限于邮箱、设备 ID、位置等。您所提供的所有信息均来自于您本人在注册时提供，以及我们从第三方合作伙伴获取的数据。'
    ]
  },
  {
    title: '我们如何存储和保护您的个人信息',
    paragraphs: [
      '作为一般规则，我们仅在实现信息收集目的所需的时间内保留您的个人信息（例如，当您开立帐户从我们的产品获取服务时）。出于遵守法律义务或为证明某项权利或合同满足适用的诉讼时效要求的目的，我们可能需要在上述期限到期后保留您存档的个人信息，并且无法按您的要求删除。当您的个人信息对于我们的法定义务或法定时效对应的目的或档案不再必要时，我们确保将其完全删除或匿名化。如果您确认不再使用我们的产品和服务，并按照要求主动注销了您的账户，所有信息将被完全删除。'
    ]
  },
  {
    title: '您的权利（GDPR/CCPA）',
    paragraphs: ['根据您所在的司法管辖区，您可能有权：'],
    bullets: [
      '访问我们持有的关于您的个人信息。',
      '请求更正或删除您的数据。',
      '反对某些类型的处理。'
    ]
  },
  {
    title: '我们如何共享、转让、公开披露您的个人信息',
    paragraphs: [
      '在管理我们的日常业务活动所需要时，为追求合法利益以更好地服务客户，我们将合规且恰当的使用您的个人信息。出于对业务和各个方面的综合考虑，我们仅自身使用这些数据，不与任何第三方分享。',
      '我们可能会根据法律法规规定，或按政府主管部门的强制性要求，对外共享您的个人信息。在符合法律法规的前提下，当我们收到上述披露信息的请求时，我们会要求必须出具与之相应的法律文件，如传票或调查函。我们坚信，对于要求我们提供的信息，应该在法律允许的范围内尽可能保持透明。'
    ],
    bullets: [
      '与国家安全、国防安全直接相关的；',
      '与犯罪侦查、起诉、审判和判决执行等直接相关的；',
      '出于维护您或其他个人的生命、财产等重大合法权益但又很难得到本人同意的；',
      '您自行向社会公众公开的个人信息；',
      '从合法公开披露的信息中收集个人信息的，如合法的新闻报道、政府信息公开等渠道。',
      '根据个人信息主体要求签订和履行合同所必需的；',
      '用于维护所提供的产品或服务的安全稳定运行所必需的，例如发现、处置产品或服务的故障；',
      '法律法规规定的其他情形。'
    ]
  },
  {
    title: '第三方服务',
    paragraphs: [
      '请注意，本应用使用了第三方服务，这些服务有自己的隐私政策来处理数据。以下是本应用使用的第三方服务提供商的隐私政策链接：',
      'Google Analytics'
    ]
  },
  {
    title: '我们如何使用 Cookie 和其他追踪技术',
    paragraphs: [
      '为确保产品正常运转，我们会在您的计算机或移动设备上存储名为 Cookie 的小数据文件。Cookie 通常包含标识符、产品名称以及一些号码和字符。借助于 Cookie，我们能够存储您的偏好或商品等数据，并用以判断注册用户是否已经登录，提升服务和产品质量及优化用户体验。',
      '我们出于不同的目的使用各种Cookie，包括：严格必要型Cookie、性能Cookie、营销Cookie和功能Cookie。某些Cookie可能由外部第三方提供，以向我们的产品提供其它功能。我们不会将 Cookie 用于本政策所述目的之外的任何用途。您可根据自己的偏好管理或删除 Cookie。您可以清除计算机上或手机中保存的所有 Cookie，大部分网络浏览器都设有阻止或禁用 Cookie 的功能，您可对浏览器进行配置。阻止或禁用 Cookie 功能后，可能影响您使用或不能充分使用我们的产品和服务。'
    ]
  },
  {
    title: '我们如何处理未成年人的个人信息',
    paragraphs: [
      '我们的产品、网站和服务主要面向成人。如果没有父母或监护人的同意，儿童不得创建自己的用户账户。对于经父母同意而收集儿童个人信息的情况，我们只会在受到法律允许、父母或监护人明确同意或者保护儿童所必要的情况下使用或公开披露此信息。',
      '如果我们发现自己在未事先获得可证实的父母同意的情况下收集了儿童的个人信息，则会设法尽快删除相关数据。若您是未成年人的监护人，当您对您所监护的未成年人使用我们的服务或其向我们提供的用户信息有任何疑问时，请您及时与我们联系。我们将根据国家相关法律法规及本政策的规定保护未成年人用户信息的保密性及安全性。'
    ]
  },
  {
    title: '本隐私政策的变更',
    paragraphs: [
      '我们可能会不时更新我们的隐私政策。因此，建议您定期查看此页以了解更改。如有任何更改，我们会在本页公布新的隐私政策。',
      '该政策自2026年10月1日起生效。'
    ]
  },
  {
    title: '联系我们',
    paragraphs: [
      '如您在阅读过程中，对本政策有任何疑问，可联系我们的客服咨询，请通过 guanzhujiaran2022@163.com 或产品中的反馈方式与我们取得联系，我们将尽力在合理时间内回复并解决您的问题。'
    ]
  }
]

const introParagraphs = [
  '欢迎您访问我们的产品。本应用（以下简称"产品和服务"）是由我们（以下简称"我们"）开发并运营的。确保用户的数据安全和隐私保护是我们的首要任务，本隐私政策载明了您访问和使用我们的产品和服务时所收集的数据及其处理方式。本应用以免费的服务形式提供。',
  '请您在继续使用我们的产品前，务必认真仔细阅读并确认充分理解本隐私政策全部规则和要点。一旦您选择使用，即视为您同意本隐私政策的全部内容。如您不同意相关协议或其中的任何条款，应停止使用我们的产品和服务。',
  '本隐私政策帮助您了解以下内容：'
]

const introBullets = [
  '我们如何收集和使用您的个人信息；',
  '我们如何存储和保护您的个人信息；',
  '我们如何共享、转让、公开披露您的个人信息；',
  '第三方服务',
  '我们如何使用 Cookie 和其他追踪技术',
  '我们如何处理未成年人的个人信息'
]
</script>

<template>
  <div class="privacy-policy-view max-w-3xl mx-auto px-6 py-10">
    <el-text tag="h1" size="large" class="privacy-policy-view__title block text-3xl font-bold text-text-primary mb-2">
      本应用隐私政策
    </el-text>
    <el-text class="privacy-policy-view__effective block text-text-secondary mb-8">生效日期：2026年10月1日</el-text>

    <el-text class="privacy-policy-view__intro block text-text-regular leading-relaxed mb-2">
      {{ introParagraphs[0] }}
    </el-text>
    <el-text class="privacy-policy-view__intro block text-text-regular leading-relaxed mb-2">
      {{ introParagraphs[1] }}
    </el-text>
    <el-text class="privacy-policy-view__intro block text-text-regular leading-relaxed mb-2">
      {{ introParagraphs[2] }}
    </el-text>
    <ul class="privacy-policy-view__intro-list list-disc pl-6 mb-8">
      <li v-for="item in introBullets" :key="item" class="privacy-policy-view__intro-item text-text-regular leading-relaxed">
        {{ item }}
      </li>
    </ul>

    <section
      v-for="section in sections"
      :key="section.title"
      class="privacy-policy-view__section mb-8"
    >
      <el-text tag="h2" size="large" class="privacy-policy-view__section-title block text-xl font-bold text-text-primary mb-3">
        {{ section.title }}
      </el-text>
      <el-text
        v-for="(paragraph, index) in section.paragraphs"
        :key="index"
        class="privacy-policy-view__paragraph block text-text-regular leading-relaxed mb-2"
      >
        {{ paragraph }}
      </el-text>
      <ul v-if="section.bullets" class="privacy-policy-view__bullets list-disc pl-6">
        <li v-for="bullet in section.bullets" :key="bullet" class="privacy-policy-view__bullet text-text-regular leading-relaxed">
          {{ bullet }}
        </li>
      </ul>
    </section>
  </div>
</template>
