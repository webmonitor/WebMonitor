const docsZhCN = {
  title: '使用文档',
  subtitle: '了解如何使用 WebMonitor 监控网页内容变化并获取即时通知。',
  footerCta: {
    title: '准备好开始监控了吗？',
    subtitle: '立即注册账号，开始追踪您关心的网页内容变化。',
    primary: '免费注册',
    secondary: '立即登录',
  },
  sections: [
    {
      id: 'quick-start',
      title: '快速开始',
      blocks: [
        {
          type: 'text',
          paragraphs: [
            '欢迎使用 WebMonitor。只需几个简单步骤，您就可以创建第一个网页监控流程。',
          ],
        },
        {
          type: 'subsection',
          title: '1. 注册账户',
          paragraphs: [
            '打开注册页面，填写用户名、邮箱和密码即可创建账户。注册完成后会自动跳转到登录页面。',
          ],
          tip: {
            type: 'info',
            text: '请使用有效邮箱地址，以便接收监控通知。',
          },
        },
        {
          type: 'subsection',
          title: '2. 添加邮件配置',
          paragraphs: [
            '在创建监控任务之前，请先在邮件配置页面添加 SMTP 配置。',
            '您需要准备 SMTP 主机、端口、发件邮箱、密码或应用专用密码，以及收件邮箱。',
          ],
        },
        {
          type: 'subsection',
          title: '3. 创建监控任务',
          paragraphs: [
            '进入监控任务页面，点击创建按钮并填写以下信息：',
          ],
          list: {
            type: 'ul',
            items: [
              '方便识别的任务名称',
              '要监控的目标 URL',
              '用于定位内容的 XPath 选择器',
              '检查间隔（秒）',
              '用于通知的邮件配置',
            ],
          },
        },
        {
          type: 'subsection',
          title: '4. 查看监控结果',
          paragraphs: [
            '任务创建后，WebMonitor 会按照配置的间隔自动检查页面。',
            '您可以在仪表板查看总体概况，在监控日志页面查看详细执行记录。',
          ],
        },
      ],
    },
    {
      id: 'monitor-tasks',
      title: '监控任务',
      blocks: [
        {
          type: 'subsection',
          title: '监控任务的作用',
          paragraphs: [
            '监控任务用于跟踪网页中的特定内容，并在内容变化时发送通知。',
            'WebMonitor 基于 Selenium WebDriver，可以处理许多依赖 JavaScript 渲染的页面。',
          ],
        },
        {
          type: 'subsection',
          title: 'XPath 选择器指南',
          paragraphs: [
            'XPath 用于帮助 WebMonitor 精确定位您想监控的页面元素。以下是一些常用示例：',
          ],
          codeExamples: [
            { label: '按 ID 选择', language: 'xpath', code: '//*[@id="price"]' },
            { label: '按 class 选择', language: 'xpath', code: '//div[@class="product-price"]' },
            { label: '按文本选择', language: 'xpath', code: '//span[contains(text(), "库存")]' },
            { label: '监控整个页面 body', language: 'xpath', code: '//body' },
          ],
          tip: {
            type: 'success',
            text: '可在浏览器开发者工具中使用“复制 XPath”来加快配置速度。',
          },
        },
        {
          type: 'subsection',
          title: '检查间隔',
          paragraphs: [
            '检查间隔决定了 WebMonitor 多久检查一次目标页面。',
          ],
          list: {
            type: 'ul',
            items: [
              '最小间隔：10 秒',
              '默认间隔：300 秒（5 分钟）',
              '最大间隔：86,400 秒（24 小时）',
            ],
          },
          tip: {
            type: 'warning',
            text: '过短的间隔可能触发目标网站的访问限制，请根据实际需求合理设置。',
          },
        },
        {
          type: 'subsection',
          title: '公开任务',
          paragraphs: [
            '您可以将任务设为公开，让其他用户订阅该任务并接收各自的通知。',
          ],
          list: {
            type: 'ul',
            items: [
              '私有任务：只有您自己可以查看和管理',
              '公开任务：会出现在公开任务市场，其他用户可订阅',
            ],
          },
        },
        {
          type: 'subsection',
          title: '测试任务',
          paragraphs: [
            '创建任务后，可使用测试操作验证 XPath 选择器和邮件设置是否正确。',
          ],
        },
      ],
    },
    {
      id: 'email-config',
      title: '邮件配置',
      blocks: [
        {
          type: 'subsection',
          title: '配置 SMTP',
          paragraphs: [
            '邮件配置定义了通知邮件如何发送。每个配置包含：',
          ],
          list: {
            type: 'ul',
            items: [
              '可读性好的配置名称',
              'SMTP 服务器地址',
              'SMTP 端口，通常为 465（SSL）或 587（TLS）',
              '发件人邮箱',
              'SMTP 密码或应用专用密码',
              '收件人邮箱',
            ],
          },
        },
        {
          type: 'subsection',
          title: '常见 SMTP 示例',
          codeExamples: [
            { label: 'Gmail', code: '服务器: smtp.gmail.com\n端口: 465 (SSL) 或 587 (TLS)\n建议使用应用专用密码' },
            { label: 'QQ 邮箱', code: '服务器: smtp.qq.com\n端口: 465 (SSL)\n启用 SMTP 并使用授权码' },
            { label: '163 邮箱', code: '服务器: smtp.163.com\n端口: 465 (SSL)\n启用 SMTP 并使用客户端授权密码' },
            { label: 'Outlook / Hotmail', code: '服务器: smtp.office365.com\n端口: 587 (TLS)' },
          ],
          tip: {
            type: 'info',
            text: '多数邮箱服务商要求使用应用专用密码或授权码，而不是邮箱登录密码。',
          },
        },
        {
          type: 'subsection',
          title: '发送测试邮件',
          paragraphs: [
            '保存配置后，可使用测试操作验证 SMTP 设置是否可正常发送邮件。',
          ],
        },
      ],
    },
    {
      id: 'public-tasks',
      title: '公开任务与订阅',
      blocks: [
        {
          type: 'subsection',
          title: '浏览公开任务',
          paragraphs: [
            '在公开任务页面中，您可以发现其他用户共享的监控任务。',
          ],
          list: {
            type: 'ul',
            items: [
              '任务名称和描述',
              '目标网址',
              '创建者信息',
              '检查间隔',
              '当前订阅人数',
            ],
          },
        },
        {
          type: 'subsection',
          title: '订阅任务',
          paragraphs: [
            '订阅后，当公开任务检测到内容变化时，您会收到对应通知。',
          ],
          list: {
            type: 'ol',
            items: [
              '找到您感兴趣的任务',
              '点击“订阅”',
              '选择接收通知的邮件配置',
              '确认订阅',
            ],
          },
          tip: {
            type: 'info',
            text: '订阅公开任务前，您需要至少创建一个邮件配置。',
          },
        },
        {
          type: 'subsection',
          title: '管理订阅',
          paragraphs: [
            '在我的订阅页面，您可以查看所有已订阅任务、开启或关闭通知、更换邮件配置，或取消订阅。',
          ],
        },
        {
          type: 'subsection',
          title: '订阅限制',
          paragraphs: [
            '每个用户都有订阅数量配额，本项目默认限制为 10 个订阅。',
          ],
        },
      ],
    },
    {
      id: 'dashboard',
      title: '仪表板与日志',
      blocks: [
        {
          type: 'subsection',
          title: '仪表板概览',
          paragraphs: [
            '仪表板可以帮助您快速了解当前监控系统的运行情况。',
          ],
          list: {
            type: 'ul',
            items: [
              '任务总数',
              '运行中的任务数量',
              '最近检测到的变化',
              '监控执行成功率',
              '最新监控活动',
            ],
          },
        },
        {
          type: 'subsection',
          title: '监控日志',
          paragraphs: [
            '监控日志保存了每次检查的详细记录。',
          ],
          list: {
            type: 'ul',
            items: [
              '检查时间',
              '任务信息',
              '执行结果',
              '是否检测到内容变化',
              '内容预览（如果有）',
              '失败时的错误信息',
            ],
          },
        },
        {
          type: 'subsection',
          title: '状态说明',
          list: {
            type: 'ul',
            items: [
              '正常：检查成功，未检测到变化',
              '变化：检查成功，内容发生变化',
              '失败：检查失败，可能与网络、页面或选择器有关',
            ],
          },
        },
      ],
    },
    {
      id: 'faq',
      title: '常见问题',
      blocks: [
        {
          type: 'subsection',
          title: 'XPath 选择器无法工作',
          paragraphs: [
            '问题：任务无法抓取内容，或者返回结果始终为空。',
          ],
          list: {
            type: 'ol',
            items: [
              '在浏览器开发者工具中验证 XPath 是否正确',
              '确认目标元素是否为异步加载',
              '尝试使用 //body 等更简单的选择器验证页面加载情况',
              '在启用持续监控前，先使用内置测试操作',
            ],
          },
        },
        {
          type: 'subsection',
          title: '邮件发送失败',
          paragraphs: [
            '问题：测试邮件发送失败，或者没有收到通知邮件。',
          ],
          list: {
            type: 'ol',
            items: [
              '确认 SMTP 主机和端口是否正确',
              '如服务商要求，请使用应用专用密码而不是登录密码',
              '确认邮箱设置中已启用 SMTP',
              '检查垃圾邮件箱',
              '确认 SSL/TLS 选项与端口相匹配',
            ],
          },
        },
        {
          type: 'subsection',
          title: '监控任务无法创建',
          paragraphs: [
            '问题：创建任务时因为受限域名或配置错误而被阻止。',
          ],
          list: {
            type: 'ul',
            items: [
              '某些域名可能被管理员加入黑名单',
              '请确保 URL 包含 http:// 或 https://',
              '创建任务前请先添加邮件配置',
            ],
          },
        },
        {
          type: 'subsection',
          title: '达到订阅上限',
          paragraphs: [
            '问题：无法继续订阅更多公开任务。',
          ],
          list: {
            type: 'ul',
            items: [
              '取消不再需要的订阅',
              '如有需要，可联系管理员增加配额',
            ],
          },
        },
      ],
    },
  ],
};

export default docsZhCN;
