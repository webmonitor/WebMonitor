const docsEn = {
  title: 'Documentation',
  subtitle: 'Learn how to monitor web content changes and receive timely notifications with WebMonitor.',
  footerCta: {
    title: 'Ready to start monitoring?',
    subtitle: 'Create an account and start tracking the pages that matter to you.',
    primary: 'Sign up free',
    secondary: 'Log in',
  },
  sections: [
    {
      id: 'quick-start',
      title: 'Quick start',
      blocks: [
        {
          type: 'text',
          paragraphs: [
            'Welcome to WebMonitor. You can create your first monitoring workflow in just a few steps.',
          ],
        },
        {
          type: 'subsection',
          title: '1. Create an account',
          paragraphs: [
            'Open the registration page and fill in your username, email address, and password. After registration you will be redirected to the login page.',
          ],
          tip: {
            type: 'info',
            text: 'Use a valid email address so you can receive monitoring notifications.',
          },
        },
        {
          type: 'subsection',
          title: '2. Add an email configuration',
          paragraphs: [
            'Before creating a monitoring task, configure an SMTP account in the Email Config page.',
            'You will need the SMTP host, port, sender email, password or app password, and receiver email.',
          ],
        },
        {
          type: 'subsection',
          title: '3. Create a monitoring task',
          paragraphs: [
            'Open the Monitor Tasks page and click the create button. Fill in the following fields:',
          ],
          list: {
            type: 'ul',
            items: [
              'Task name for easy identification',
              'Target URL to monitor',
              'XPath selector used to locate the content',
              'Check interval in seconds',
              'Email configuration used for notifications',
            ],
          },
        },
        {
          type: 'subsection',
          title: '4. Review monitoring results',
          paragraphs: [
            'After a task is created, WebMonitor checks the page automatically according to the configured interval.',
            'Use the Dashboard for a high-level overview and the Monitor Logs page for detailed execution history.',
          ],
        },
      ],
    },
    {
      id: 'monitor-tasks',
      title: 'Monitor tasks',
      blocks: [
        {
          type: 'subsection',
          title: 'What a monitor task does',
          paragraphs: [
            'A monitor task watches a specific part of a web page and sends notifications when the content changes.',
            'WebMonitor uses Selenium WebDriver, so it can handle many JavaScript-rendered pages that simple scrapers cannot.',
          ],
        },
        {
          type: 'subsection',
          title: 'XPath selector guide',
          paragraphs: [
            'XPath helps WebMonitor locate the exact element you want to watch. Here are a few common examples:',
          ],
          codeExamples: [
            { label: 'Select by ID', language: 'xpath', code: '//*[@id="price"]' },
            { label: 'Select by class', language: 'xpath', code: '//div[@class="product-price"]' },
            { label: 'Select by text', language: 'xpath', code: '//span[contains(text(), "In stock")]' },
            { label: 'Watch the whole page body', language: 'xpath', code: '//body' },
          ],
          tip: {
            type: 'success',
            text: 'Open developer tools in your browser and use Copy XPath to speed up selector setup.',
          },
        },
        {
          type: 'subsection',
          title: 'Check interval',
          paragraphs: [
            'The interval controls how often WebMonitor checks the target page.',
          ],
          list: {
            type: 'ul',
            items: [
              'Minimum interval: 10 seconds',
              'Default interval: 300 seconds (5 minutes)',
              'Maximum interval: 86,400 seconds (24 hours)',
            ],
          },
          tip: {
            type: 'warning',
            text: 'Very short intervals may trigger rate limits on the target site. Choose a practical interval for your use case.',
          },
        },
        {
          type: 'subsection',
          title: 'Public tasks',
          paragraphs: [
            'You can publish a task so other users can subscribe to it and receive their own notifications.',
          ],
          list: {
            type: 'ul',
            items: [
              'Private task: only you can view and manage it',
              'Public task: appears in the public marketplace for others to subscribe',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Test a task',
          paragraphs: [
            'Use the test action after creating a task to verify that your XPath selector and email setup work as expected.',
          ],
        },
      ],
    },
    {
      id: 'email-config',
      title: 'Email configuration',
      blocks: [
        {
          type: 'subsection',
          title: 'Configure SMTP',
          paragraphs: [
            'Email configurations define how notifications are sent. Each config includes:',
          ],
          list: {
            type: 'ul',
            items: [
              'A readable configuration name',
              'SMTP server host',
              'SMTP port, usually 465 for SSL or 587 for TLS',
              'Sender email address',
              'SMTP password or app password',
              'Receiver email address',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Common SMTP examples',
          codeExamples: [
            { label: 'Gmail', code: 'Server: smtp.gmail.com\nPort: 465 (SSL) or 587 (TLS)\nUse an app password' },
            { label: 'QQ Mail', code: 'Server: smtp.qq.com\nPort: 465 (SSL)\nEnable SMTP and use an authorization code' },
            { label: '163 Mail', code: 'Server: smtp.163.com\nPort: 465 (SSL)\nEnable SMTP and use a client authorization password' },
            { label: 'Outlook / Hotmail', code: 'Server: smtp.office365.com\nPort: 587 (TLS)' },
          ],
          tip: {
            type: 'info',
            text: 'Most providers require an app password or authorization code rather than your normal mailbox password.',
          },
        },
        {
          type: 'subsection',
          title: 'Send a test email',
          paragraphs: [
            'After saving a configuration, use the test action to verify that the SMTP settings work correctly.',
          ],
        },
      ],
    },
    {
      id: 'public-tasks',
      title: 'Public tasks and subscriptions',
      blocks: [
        {
          type: 'subsection',
          title: 'Browse public tasks',
          paragraphs: [
            'The Public Tasks page lets you discover tasks shared by other users.',
          ],
          list: {
            type: 'ul',
            items: [
              'Task name and description',
              'Target URL',
              'Owner information',
              'Check interval',
              'Current subscription count',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Subscribe to a task',
          paragraphs: [
            'When you subscribe, you will receive notifications when that public task detects changes.',
          ],
          list: {
            type: 'ol',
            items: [
              'Find a task you care about',
              'Click Subscribe',
              'Choose the email configuration for notifications',
              'Confirm the subscription',
            ],
          },
          tip: {
            type: 'info',
            text: 'You need at least one email configuration before subscribing to public tasks.',
          },
        },
        {
          type: 'subsection',
          title: 'Manage subscriptions',
          paragraphs: [
            'The My Subscriptions page lets you review every subscribed task, turn notifications on or off, switch the email configuration, or unsubscribe.',
          ],
        },
        {
          type: 'subsection',
          title: 'Subscription limits',
          paragraphs: [
            'Each user has a subscription quota. The default limit in this project is 10 subscriptions.',
          ],
        },
      ],
    },
    {
      id: 'dashboard',
      title: 'Dashboard and logs',
      blocks: [
        {
          type: 'subsection',
          title: 'Dashboard overview',
          paragraphs: [
            'The dashboard gives you a quick view of the health of your monitoring setup.',
          ],
          list: {
            type: 'ul',
            items: [
              'Total number of tasks',
              'Running tasks',
              'Recent detected changes',
              'Monitoring success rate',
              'Latest monitoring activity',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Monitor logs',
          paragraphs: [
            'Monitor logs contain a detailed history of every check.',
          ],
          list: {
            type: 'ul',
            items: [
              'Check timestamp',
              'Task information',
              'Execution result',
              'Whether content changed',
              'Content preview when available',
              'Error information when a check fails',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Status meanings',
          list: {
            type: 'ul',
            items: [
              'Normal: check succeeded and no change was detected',
              'Changed: check succeeded and content changed',
              'Failed: the check failed because of a network, page, or selector issue',
            ],
          },
        },
      ],
    },
    {
      id: 'faq',
      title: 'FAQ',
      blocks: [
        {
          type: 'subsection',
          title: 'My XPath selector does not work',
          paragraphs: [
            'Problem: the task cannot capture content or always returns blank results.',
          ],
          list: {
            type: 'ol',
            items: [
              'Verify the XPath in browser developer tools',
              'Check whether the target element is loaded asynchronously',
              'Try a simpler selector such as //body to validate the page load',
              'Use the built-in test action before enabling continuous monitoring',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Email delivery fails',
          paragraphs: [
            'Problem: test mail fails or no notification email arrives.',
          ],
          list: {
            type: 'ol',
            items: [
              'Confirm the SMTP host and port',
              'Use an app password instead of your normal login password when required',
              'Make sure SMTP is enabled in your mailbox settings',
              'Check the spam folder',
              'Make sure the SSL/TLS option matches the selected port',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'A monitor task cannot be created',
          paragraphs: [
            'Problem: task creation is blocked because of a restricted domain or invalid configuration.',
          ],
          list: {
            type: 'ul',
            items: [
              'Some domains may be blocked by the administrator blacklist',
              'Make sure the URL includes http:// or https://',
              'Create an email configuration before creating a task',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'I reached the subscription limit',
          paragraphs: [
            'Problem: you cannot subscribe to more public tasks.',
          ],
          list: {
            type: 'ul',
            items: [
              'Remove subscriptions you no longer need',
              'Ask an administrator to increase your quota if needed',
            ],
          },
        },
      ],
    },
  ],
};

export default docsEn;
